import { React, ReactNative } from "@metro/common";
import { stylesheet } from "@metro/common";
import { storage } from "@vendetta/plugin";
import { logger } from "@vendetta";
import { Forms } from "@vendetta/ui/components";

const { View, Text, Pressable, PanResponder, Animated, Dimensions } = ReactNative;

type Mode = "idle" | "walk" | "sit" | "sleep";

const DEFAULTS = {
  enabled: true, size: 72, speed: 1, opacity: 1,
  autoWalk: true, idleSeconds: 8, x: 16, y: 120,
};
type SettingsState = typeof DEFAULTS;
const state = Object.assign({}, DEFAULTS, storage ?? {}) as SettingsState;

const styles = stylesheet.createThemedStyleSheet({
  root: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 999999, elevation: 999999 },
  cat: { position: "absolute", alignItems: "center", justifyContent: "center" },
  bubble: { backgroundColor: "rgba(20,20,25,0.9)", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 1 },
  bubbleText: { color: "#fff", fontSize: 11 },
});

const FRAMES: Record<Mode, string[]> = {
  idle: ["🐈", "🐈", "😺", "🐈"],
  walk: ["🐈", "🐾", "🐈", "🐾"],
  sit: ["🐈", "😺", "🐈"],
  sleep: ["😴", "💤", "😴", "💤"],
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const save = () => Object.assign(storage, state);

function Cat() {
  const [mode, setMode] = React.useState<Mode>("idle");
  const [frame, setFrame] = React.useState(0);
  const position = React.useRef(new Animated.ValueXY({ x: state.x, y: state.y })).current;
  const dragOrigin = React.useRef({ x: state.x, y: state.y });
  const dragging = React.useRef(false);
  const lastActivity = React.useRef(Date.now());

  const responder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragging.current = true;
      dragOrigin.current = { x: state.x, y: state.y };
      position.stopAnimation();
      lastActivity.current = Date.now();
    },
    onPanResponderMove: (_, gesture) => {
      const { width, height } = Dimensions.get("window");
      position.setValue({
        x: clamp(dragOrigin.current.x + gesture.dx, 0, Math.max(0, width - state.size)),
        y: clamp(dragOrigin.current.y + gesture.dy, 0, Math.max(0, height - state.size - 20)),
      });
    },
    onPanResponderRelease: (_, gesture) => {
      dragging.current = false;
      const { width, height } = Dimensions.get("window");
      state.x = clamp(dragOrigin.current.x + gesture.dx, 0, Math.max(0, width - state.size));
      state.y = clamp(dragOrigin.current.y + gesture.dy, 0, Math.max(0, height - state.size - 20));
      position.setValue({ x: state.x, y: state.y });
      save();
      lastActivity.current = Date.now();
      setMode("idle");
    },
    onPanResponderTerminate: () => { dragging.current = false; },
  }), []);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame(v => v + 1);
      if (!dragging.current && state.autoWalk) {
        const idle = (Date.now() - lastActivity.current) / 1000;
        setMode(idle >= state.idleSeconds ? "sleep" : idle >= state.idleSeconds / 2 ? "sit" : "walk");
      }
    }, Math.max(100, 260 / state.speed));
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!state.autoWalk || dragging.current || mode !== "walk") return;
    const { width } = Dimensions.get("window");
    const target = state.x < width / 2 ? width - state.size - 12 : 12;
    Animated.timing(position.x, {
      toValue: target,
      duration: Math.max(1800, 5000 / state.speed),
      useNativeDriver: false,
    }).start(({ finished }: any) => {
      if (finished && !dragging.current) {
        state.x = target;
        save();
        lastActivity.current = Date.now();
      }
    });
  }, [mode]);

  const frame = FRAMES[mode][frame % FRAMES[mode].length];

  return (
    <Animated.View style={[styles.cat, { width: state.size, height: state.size + 24, opacity: state.opacity }, position.getLayout()]} {...responder.panHandlers}>
      <Pressable
        onPress={() => { lastActivity.current = Date.now(); setMode("sit"); }}
        onLongPress={() => { lastActivity.current = Date.now(); setMode("sleep"); }}
        style={{ alignItems: "center" }}
      >
        {mode === "sleep" && <View style={styles.bubble}><Text style={styles.bubbleText}>zzz</Text></View>}
        <Text style={{ fontSize: state.size * 0.65, lineHeight: state.size * 0.78 }}>{frame}</Text>
      </Pressable>
    </Animated.View>
  );
}

function Overlay() {
  return state.enabled ? <View pointerEvents="box-none" style={styles.root}><Cat /></View> : null;
}

function Settings() {
  const [, redraw] = React.useState(0);
  const update = (key: keyof SettingsState, value: any) => {
    (state as any)[key] = value;
    save();
    redraw(v => v + 1);
  };
  return <View style={{ padding: 16 }}>
    <Forms.FormText>Floating Cat</Forms.FormText>
    <Forms.FormText style={{ marginTop: 6, opacity: 0.7 }}>Drag, tap, or long-press the cat.</Forms.FormText>
    <Forms.FormDivider />
    <Forms.FormSwitch label="Enable cat" value={state.enabled} onValueChange={(v: boolean) => update("enabled", v)} />
    <Forms.FormSwitch label="Automatic walking" value={state.autoWalk} onValueChange={(v: boolean) => update("autoWalk", v)} />
    <Forms.FormInput label="Size" value={String(state.size)} keyboardType="numeric" onChange={(v: string) => update("size", clamp(Number(v) || 72, 32, 160))} />
    <Forms.FormInput label="Speed" value={String(state.speed)} keyboardType="decimal-pad" onChange={(v: string) => update("speed", clamp(Number(v) || 1, 0.25, 3))} />
    <Forms.FormInput label="Opacity" value={String(state.opacity)} keyboardType="decimal-pad" onChange={(v: string) => update("opacity", clamp(Number(v) || 1, 0.2, 1))} />
    <Forms.FormInput label="Sleep after seconds" value={String(state.idleSeconds)} keyboardType="numeric" onChange={(v: string) => update("idleSeconds", clamp(Number(v) || 8, 2, 120))} />
  </View>;
}

/*
 * Kettu/Vendetta releases expose slightly different UI helpers. We probe
 * only documented-style plugin UI surfaces and fail safely if none exists.
 */
function mount() {
  const runtime = globalThis as any;
  const ui = runtime.bunny?.plugin?.ui ?? runtime.vendetta?.plugin?.ui;
  const add = ui?.addOverlay ?? ui?.addView ?? ui?.registerOverlay;
  const remove = ui?.removeOverlay ?? ui?.removeView ?? ui?.unregisterOverlay;
  if (typeof add !== "function") {
    logger.log("Floating Cat: no compatible overlay helper was exposed by this Kettu build.");
    return;
  }
  try {
    const mounted = add(Overlay);
    (globalThis as any).__floatingCatCleanup = () => {
      try { if (typeof remove === "function") remove(mounted ?? Overlay); } catch {}
    };
  } catch (error) {
    logger.error?.(String(error));
  }
}

export default {
  onLoad() {
    logger.log("Floating Cat loaded");
    mount();
  },
  onUnload() {
    try { (globalThis as any).__floatingCatCleanup?.(); } catch {}
    delete (globalThis as any).__floatingCatCleanup;
    logger.log("Floating Cat unloaded");
  },
  settings: Settings,
};
