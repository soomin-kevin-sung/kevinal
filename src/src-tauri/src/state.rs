use parking_lot::Mutex;
use portable_pty::MasterPty;
use std::collections::HashMap;
use std::io::Write;

pub struct PtySession {
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
    pub child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct AppState {
    pub sessions: Mutex<HashMap<String, PtySession>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}
