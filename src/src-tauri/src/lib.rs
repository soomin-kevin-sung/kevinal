mod commands;
mod pty_manager;
mod state;
mod window;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::create_terminal,
            commands::write_terminal,
            commands::resize_terminal,
            commands::close_terminal,
            window::create_window,
            window::close_window,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let app = window.app_handle();
                // Check if all windows are closed
                if app.webview_windows().is_empty() {
                    // Kill all PTY sessions
                    let state = app.state::<AppState>();
                    let mut sessions = state.sessions.lock();
                    for (_, mut session) in sessions.drain() {
                        let _ = session.child.kill();
                    }
                    // Exit the app
                    app.exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
