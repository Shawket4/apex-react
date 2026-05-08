//! Apex Fleet — Tauri desktop shell.
//!
//! Phase 1: thin native wrapper around the existing Vite+React SPA.
//! The frontend still talks directly to the remote API via axios.
//! Rust only provides health-check commands for now.

#[tauri::command]
fn ping() -> &'static str {
    "pong"
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![ping, get_app_version])
        .run(tauri::generate_context!())
        .expect("error while running apex-fleet");
}
