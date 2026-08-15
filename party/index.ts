import type { Room, Connection, Server } from "partykit/server";

export default class ConnectionCounterServer implements Server {
  constructor(readonly room: Room) {}

  onConnect(connection: Connection) {
    console.log(`New listener connected: ${connection.id}`);
    this.broadcastCount();
  }

  onClose(connection: Connection) {
    console.log(`Listener disconnected: ${connection.id}`);
    this.broadcastCount();
  }

  private broadcastCount() {
    const count = Array.from(this.room.getConnections()).length;
    console.log(`Current active listeners: ${count}`);
    this.room.broadcast(
      JSON.stringify({
        type: "count",
        count: count
      })
    );
  }
}
