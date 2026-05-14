import { OnlineHome } from "../components/online/OnlineHome";
import { OnlinePlayerView } from "../components/online/OnlinePlayerView";
import { useOnlineRoom } from "./useOnlineRoom";
import { OnlineGmController } from "./OnlineGmController";

interface OnlineAppProps {
  initialRoomCode?: string;
  onBack: () => void;
}

export function OnlineApp({ initialRoomCode = "", onBack }: OnlineAppProps) {
  const online = useOnlineRoom();

  if (online.gmSnapshot) {
    return <OnlineGmController snapshot={online.gmSnapshot} sendCommand={online.sendCommand} />;
  }

  if (online.playerSnapshot) {
    return (
      <OnlinePlayerView
        snapshot={online.playerSnapshot}
        onRevealDone={() => online.sendCommand({ type: "player:roleRevealDone" })}
        onLeave={() => online.sendCommand({ type: "player:leaveRoom" })}
      />
    );
  }

  return <OnlineHome online={online} initialRoomCode={initialRoomCode} onBack={onBack} />;
}
