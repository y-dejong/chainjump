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
        await self.websocket.send(f"cs3.54,0.00,0.00,3.34,3.12,2.77;s0.00,0.00,1.90,1.68,3.14,6.08;s0.00,1.18,1.44,0.00,5.04,6.58;s3.02,3.54,0.00,0.00,3.46,3.04;j0,0.08,3.29,1,0.06,-0.02;j1,1.96,1.62,2,0.06,1.12;j2,1.44,0.00,3,3.02,3.54;j0,1.68,1.79,3,1.34,1.52")
        await asyncio.sleep(.5)
        for i in range(4):
            await self.set_enable(i, True)
            await self.set_torque(i, 3000)
            await self.set_speed(i, 0)
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
        print("Receiving")
        assert not self.websocket is None
        try:
            async for message in self.websocket:
                print(message)
                if message[0] == "R":
                    try:
                        self.segment_angles[int(message[7])] = float(message[str(message).find(";")+1:])
                    except ValueError:
                        print("valueerror")
                        pass  # Ignore malformed messages
        except ConnectionClosed:
            print("Connection closed")
            pass  # Allow graceful exit on disconnect
        print("Done")
