use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub fn create_window(
    app: AppHandle,
    terminal_id: String,
) -> Result<String, String> {
    let label = format!("terminal-{}", &terminal_id[..8]);
    let url = format!("index.html?terminal_id={}", terminal_id);

    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
        .title("Kevinal")
        .inner_size(800.0, 600.0)
        .resizable(true)
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

    Ok(label)
}

#[tauri::command]
pub fn close_window(app: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window
            .close()
            .map_err(|e| format!("Failed to close window: {}", e))?;
    }
    Ok(())
}
