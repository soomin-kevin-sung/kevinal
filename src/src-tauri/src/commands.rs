use crate::pty_manager;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn create_terminal(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    shell: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    pty_manager::spawn_pty(&app, &state, shell, cols.unwrap_or(80), rows.unwrap_or(24))
}

#[tauri::command]
pub fn write_terminal(
    state: State<'_, AppState>,
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    pty_manager::write_to_pty(&state, &terminal_id, data.as_bytes())
}

#[tauri::command]
pub fn resize_terminal(
    state: State<'_, AppState>,
    terminal_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    pty_manager::resize_pty(&state, &terminal_id, cols, rows)
}

#[tauri::command]
pub fn close_terminal(
    state: State<'_, AppState>,
    terminal_id: String,
) -> Result<(), String> {
    pty_manager::kill_pty(&state, &terminal_id)
}
