use crate::state::{AppState, PtySession};
use base64::Engine;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

pub fn spawn_pty(
    app: &AppHandle,
    state: &AppState,
    shell: Option<String>,
    cols: u16,
    rows: u16,
) -> Result<String, String> {
    let terminal_id = Uuid::new_v4().to_string();

    let pty_system = native_pty_system();
    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let shell_cmd = shell.unwrap_or_else(|| {
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
    });

    let mut cmd = CommandBuilder::new(&shell_cmd);
    if let Ok(home) = std::env::var("USERPROFILE") {
        cmd.cwd(home);
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Drop slave - we only need the master side
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Store session
    {
        let mut sessions = state.sessions.lock();
        sessions.insert(
            terminal_id.clone(),
            PtySession {
                writer,
                master: pair.master,
                child,
            },
        );
    }

    // Spawn reader thread
    let id_clone = terminal_id.clone();
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = base64::engine::general_purpose::STANDARD.encode(&buf[..n]);
                    let event_name = format!("pty-output-{}", id_clone);
                    let _ = app_clone.emit(&event_name, data);
                }
                Err(_) => break,
            }
        }
        // Terminal exited
        let event_name = format!("pty-exit-{}", id_clone);
        let _ = app_clone.emit(&event_name, ());
    });

    Ok(terminal_id)
}

pub fn write_to_pty(state: &AppState, terminal_id: &str, data: &[u8]) -> Result<(), String> {
    let mut sessions = state.sessions.lock();
    let session = sessions
        .get_mut(terminal_id)
        .ok_or_else(|| format!("Session not found: {}", terminal_id))?;

    use std::io::Write;
    session
        .writer
        .write_all(data)
        .map_err(|e| format!("Write failed: {}", e))?;
    session
        .writer
        .flush()
        .map_err(|e| format!("Flush failed: {}", e))?;

    Ok(())
}

pub fn resize_pty(
    state: &AppState,
    terminal_id: &str,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let session = sessions
        .get(terminal_id)
        .ok_or_else(|| format!("Session not found: {}", terminal_id))?;

    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Resize failed: {}", e))?;

    Ok(())
}

pub fn kill_pty(state: &AppState, terminal_id: &str) -> Result<(), String> {
    let mut sessions = state.sessions.lock();
    if let Some(mut session) = sessions.remove(terminal_id) {
        let _ = session.child.kill();
    }
    Ok(())
}
