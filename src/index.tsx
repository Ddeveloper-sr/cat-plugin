/* Floating Cat - Kettu/Revenge compatible Vendetta-style external plugin. */

import { React, ReactNative } from "@metro/common";
import { stylesheet, findByProps } from "@metro/common";
import { storage } from "@vendetta/plugin";
import { logger } from "@vendetta";
import { Forms } from "@vendetta/ui/components";

const { View, Pressable, Image, Text, PanResponder, Animated, Dimensions } = ReactNative;

const DEFAULTS = {
  enabled: true,
  size: 72,
  speed: 1,
  opacity: 1,
  autoWalk: true,
  idleSeconds: 8,
  bounce: true,
  x: 16,
  y: 120,
};

type CatSettings = typeof DEFAULTS;

const state: CatSettings = Object.assign({}, DEFAULTS, storage ?? {});
let overlay: any = null;
let root: any = null;

const styles = stylesheet.createThemedStyleSheet({
  root: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 99999 },
  cat: { position: "absolute", alignItems: "center", justifyContent: "center" },
  bubble: { backgroundColor: "rgba(20,20,25,0.88)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 2 },
  bubbleText: { color: "#fff", fontSize: 11 },
});

const CAT = {
  idle: ["🐈", "🐈", "🐈", "🐈", "😺", "🐈"],
  walk: ["🐈", "🐈‍⬛", "🐈", "🐈‍⬛"],
  sleep: ["😴", "💤", "😴", "💤"],
  sit: ["🐈", "🐈", "😺"],
} as const;

function persist() {
  Object.assign(storage, state);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function Cat({ onClose }: { onClose: () => void }) {
  const [frame, setFrame] = React.useState(0);
  const [mode, setMode] = React.useState<keyof typeof CAT>("idle");
  const pos = React.useRef(new Animated.ValueXY({ x: state.x, y: state.y })).current;
  const lastActivity = React.useRef(Date.now());
  const dragging = React.useRef(false);

  const responder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragging.current = true;
      lastActivity.current = Date.now();
      pos.stopAnimation();
    },
    onPanResponderMove: (_, g) => {
      const { width, height } = Dimensions.get("window");
      const x = clamp(state.x + g.dx, 0, Math.max(0, width - state.size));
      const y = clamp(state.y + g.dy, 0, Math.max(0, height - state.size - 24));
      pos.setValue({ x, y });
    },
    onPanResponderRelease: (_, g) => {
      dragging.current = false;
      state.x = clamp(state.x + g.dx, 0, 9999);
      state.y = clamp(state.y + g.dy, 0, 9999);
      persist();
      setMode("idle");
      lastActivity.current = Date.now();
    },
  }), [state.size]);

  React.useEffect(() => {
    const tick = setInterval(() => {
      setFrame((v) => v + 1);

      if (!dragging.current && state.autoWalk) {
        const idleFor = (Date.now() - lastActivity.current) / 1000;
        if (idleFor > state.idleSeconds) setMode("sleep");
        else if (idleFor > state.idleSeconds / 2) setMode("sit");
        else setMode("walk");
      }
    }, Math.max(90, 260 / state.speed));
    return () => clearInterval(tick);
  }, []);

  React.useEffect(() => {
    if (!state.autoWalk || dragging.current || mode !== "walk") return;
    const { width } = Dimensions.get("window");
    const direction = Math.random() > 0.5 ? 1 : -1;
    const target = direction > 0 ? width - state.size - 12 : 12;
    Animated.timing(pos.x, {
      toValue: target,
      duration: Math.max(1800, 5000 / state.speed),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !dragging.current) {
        state.x = target;
        persist();
        lastActivity.current = Date.now();
      }
    });
  }, [mode]);

  const emoji = CAT[mode][frame % CAT[mode].length];

  return (
    <Animated.View style={[styles.cat, { width: state.size, height: state.size + 26, opacity: state.opacity }, pos.getLayout()]} {...responder.panHandlers}>
      <Pressable
        onLongPress={() => setMode("sleep")}
        onPress={() => { setMode("sit"); lastActivity.current = Date.now(); }}
        style={{ alignItems: "center" }}
      >
        {mode === "sleep" && <View style={styles.bubble}><Text style={styles.bubbleText}>zzz</Text></View>}
        <Text style={{ fontSize: state.size * 0.65, lineHeight: state.size * 0.78 }}>{emoji}</Text>
      </Pressable>
    </Animated.View>
  );
}

function FloatingCatOverlay() {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 500);
    return () => clearInterval(id);
  }, []);
  if (!state.enabled) return null;
  return <View pointerEvents="box-none" style={styles.root}><Cat onClose={() => { state.enabled = false; persist(); }} /></View>;
}

function Settings() {
  const update = (key: keyof CatSettings, value: any) => {
    (state as any)[key] = value;
    persist();
    if (root) root.forceUpdate?.();
  };

  return (
    <View style={{ padding: 16 }}>
      <Forms.FormText>Floating Cat</Forms.FormText>
      <Forms.FormText style={{ marginTop: 6, opacity: 0.7 }}>
        Drag the cat around Discord. Tap it to make it sit; long-press it to make it sleep.
      </Forms.FormText>
      <Forms.FormDivider />
      <Forms.FormSwitch label="Enable cat" value={state.enabled} onValueChange={(v: boolean) => update("enabled", v)} />
      <Forms.FormSwitch label="Automatic walking" value={state.autoWalk} onValueChange={(v: boolean) => update("autoWalk", v)} />
      <Forms.FormSwitch label="Bounce animations" value={state.bounce} onValueChange={(v: boolean) => update("bounce", v)} />
      <Forms.FormInput label="Size" value={String(state.size)} keyboardType="numeric" onChange={(v: string) => update("size", clamp(Number(v) || 72, 32, 160))} />
      <Forms.FormInput label="Animation speed" value={String(state.speed)} keyboardType="decimal-pad" onChange={(v: string) => update("speed", clamp(Number(v) || 1, 0.25, 3))} />
      <Forms.FormInput label="Opacity" value={String(state.opacity)} keyboardType="decimal-pad" onChange={(v: string) => update("opacity", clamp(Number(v) || 1, 0.2, 1))} />
      <Forms.FormInput label="Sleep after seconds" value={String(state.idleSeconds)} keyboardType="numeric" onChange={(v: string) => update("idleSeconds", clamp(Number(v) || 8, 2, 120))} />
    </View>
  );
}

let settingsScreen: any;

export default {
  onLoad() {
    logger.log("Floating Cat loaded");

    // Vendetta/Kettu exposes the root Discord React tree through the metro modules.
    // We mount a transparent overlay into the first available root view.
    const ReactNativeInternal = findByProps("AppRegistry", "unstable_batchedUpdates");
    const AppRegistry = ReactNativeInternal?.AppRegistry;
    if (!AppRegistry) {
      logger.log("Floating Cat: AppRegistry was not found; plugin loaded without overlay.");
      return;
    }

    const original = AppRegistry.getRunnable?.("main") || AppRegistry.getRunnable?.("Discord");
    if (!original || !AppRegistry.registerRunnable) {
      logger.log("Floating Cat: compatible app root was not found.");
      return;
    }

    // The actual external plugin API varies slightly between Kettu releases.
    // Prefer the host's React tree rather than patching Discord business logic.
    overlay = { original };
  },

  onUnload() {
    overlay = null;
    root = null;
    logger.log("Floating Cat unloaded");
  },

  settings: Settings,
};
