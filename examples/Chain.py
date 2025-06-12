import asyncio
from websockets.asyncio.client import connect, ClientConnection
from websockets.exceptions import ConnectionClosed

class Chain:
    def __init__(self, uri):
        self.uri = uri
        self.websocket = None
        self.segment_angles = [0.0, 0.0]
        self._receive_task = None

    async def connect(self, lobby):
        self.websocket = await connect(self.uri)
        await self.websocket.send("j" + str(lobby))
        await asyncio.sleep(.5)
        await self.websocket.send(f"cs0.0,0.0,5.0,0.0,0.0,0.0;s0.0,0.0,5.0,0.0,5.0,0.0;s0.0,0.0,5.0,0.0,10.0,0.0;j0,5.0,0.0,1,0.0,0.0;j1,5.0,0.0,2,0.0,0.0")
        await asyncio.sleep(.5)
        await self.websocket.send("sangls,0")  # subscribe to angle updates
        await self.websocket.send("sangls,1")
        self._receive_task = asyncio.create_task(self._receive_loop())

    async def disconnect(self):
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        if self.websocket:
            await self.websocket.close()

    async def create(self, params):
        assert not self.websocket is None
        await self.websocket.send(f"cs0.0,0.0,5.0,0.0,0.0,0.0;s0.0,0.0,5.0,0.0,5.0,0.0;s0.0,0.0,5.0,0.0,10.0,0.0;j0,5.0,0.0,1,0.0,0.0;j1,5.0,0.0,2,0.0,0.0")

    async def set_torque(self, index: int, value: float):
        assert not self.websocket is None
        await self.websocket.send(f"wtorq{index},{value}")

    async def set_speed(self, index: int, value: float):
        assert not self.websocket is None
        await self.websocket.send(f"wsped{index},{value}")

    async def set_enable(self, index: int, enabled: bool):
        assert not self.websocket is None
        await self.websocket.send(f"wmtre{index},{'t' if enabled else 'f'}")

    async def _receive_loop(self):
        assert not self.websocket is None
        try:
            async for message in self.websocket:
                if message[0] == "R":
                    try:
                        self.segment_angles[int(message[7])] = float(message[str(message).find(";")+1:])
                    except ValueError:
                        pass  # Ignore malformed messages
        except ConnectionClosed:
            print("Connection closed")
            pass  # Allow graceful exit on disconnect
        print("Done")
