import asyncio
from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
import uuid

PORT = 8765

connected_clients = {}  # client_id: websocket
hub_clients = []      # websocket of the hub

async def handle_client(websocket):
    global hub_clients
    hub_client = None
    client_index = len(connected_clients)
    connected_clients[client_index] = (client_index, websocket)
    print(f"Client connected: {client_index}")

    try:
        first = await websocket.recv()

        if first == "imhub":
            hub_clients.append(websocket)
            hub_client = websocket
            print(f"Hub registered: {client_index}")
            await websocket.send("hlbby" + str(len(hub_clients)-1))
        elif first[0] == "j":
            hub_index = int(first[1:])
            if hub_index < len(hub_clients):
                hub_client = hub_clients[int(first[1:])]
            else:
                print("Gave invalid hub")
                return
        else:
            print("Malformed first message")
            websocket.close()
            return

        async for message in websocket:

            if message[0] in ["r", "w", "s", "u", "c"] and websocket not in hub_clients: # Read, write, subscribe, or unsubscribe message
                await hub_client.send(f"{client_index}:{message}")

            elif message[0] in ["r", "R"] and websocket == hub_client: # Answer message or subscription answer
                target_id = message[1:message.index(":")]
                await connected_clients[int(target_id)][1].send(message[message.index(":")+1:])

    except ConnectionClosedOK:
        print(f"Client disconnected: {client_index}")
    except ConnectionClosedError:
        print(f"Client disconnected with error: {client_index}")
    finally:
        if websocket == hub_client:
            print("Hub disconnected.")
            hub_client = None
        del connected_clients[client_index]


async def main():
    async with serve(handle_client, "", PORT) as server:
        await server.serve_forever()


if __name__ == "__main__":
    print(f"WebSocket server running on port {PORT}...")
    asyncio.run(main())

