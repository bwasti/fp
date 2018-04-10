extern crate ws;
use ws::listen;

fn main() {
    if let Err(error) = listen("127.0.0.1:8080", |out| {
        move |msg| {
            println!("message {}", msg);
            out.broadcast(msg)
        }
    }) {
        println!("Error making websocket {:?}", error);
    }
}
