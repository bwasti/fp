extern crate ws;
use ws::{listen, Handler, Message, Handshake, Sender, Result, CloseCode};

struct Server {
    out: Sender,
}

impl Handler for Server {
    fn on_open(&mut self, _:Handshake) -> Result<()> {
        self.out.send(format!("{}--", self.out.connection_id()))
    }

    fn on_close(&mut self, _:CloseCode, _: &str) {
        self.out.broadcast(format!("{}--{{\"delete\":1}}", self.out.connection_id())).ok();
    }

    fn on_message(&mut self, msg: Message) -> Result<()> {
        self.out.broadcast(format!("{}--{}", self.out.connection_id(), msg))
    }
}

fn main() {
    listen("127.0.0.1:8080", |out| Server { out }).unwrap()
}
