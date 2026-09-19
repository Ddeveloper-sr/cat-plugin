import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";

const settings = {
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Show the floating cat",
        default: true,
    },
    size: {
        type: OptionType.NUMBER,
        description: "Cat size",
        default: 72,
    },
    speed: {
        type: OptionType.NUMBER,
        description: "Walking speed",
        default: 1,
    },
    opacity: {
        type: OptionType.NUMBER,
        description: "Cat opacity",
        default: 1,
    },
    autoWalk: {
        type: OptionType.BOOLEAN,
        description: "Automatically walk across the screen",
        default: true,
    },
} as const;

let cat: HTMLDivElement | null = null;
let timer: number | null = null;
let style: HTMLStyleElement | null = null;
let x = 24;
let direction = 1;
let frame = 0;

const frames = ["🐈", "😺", "🐈", "😸"];

function createCat() {
    if (cat || !settings.enabled.default) return;

    style = document.createElement("style");
    style.textContent = `
        #floating-cat-vencord {
            position: fixed;
            left: 24px;
            top: 120px;
            z-index: 2147483647;
            user-select: none;
            cursor: grab;
            touch-action: none;
            font-family: sans-serif;
            text-align: center;
        }
        #floating-cat-vencord .cat-face {
            display: block;
            line-height: 1;
            filter: drop-shadow(0 2px 3px rgba(0,0,0,.35));
        }
        #floating-cat-vencord .cat-shadow {
            height: 5px;
            width: 55%;
            margin: 2px auto 0;
            border-radius: 50%;
            background: rgba(0,0,0,.25);
        }
    `;
    document.head.appendChild(style);

    cat = document.createElement("div");
    cat.id = "floating-cat-vencord";
    cat.innerHTML = '<span class="cat-face">🐈</span><div class="cat-shadow"></div>';
    document.body.appendChild(cat);

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    const face = cat.querySelector(".cat-face") as HTMLSpanElement;

    const update = () => {
        const size = Math.max(32, Math.min(160, Number(settings.size.default) || 72));
        cat!.style.left = `${x}px`;
        cat!.style.fontSize = `${size}px`;
        cat!.style.opacity = String(Math.max(.2, Math.min(1, Number(settings.opacity.default) || 1)));
        face.textContent = frames[frame++ % frames.length];
        face.style.transform = `scaleX(${direction < 0 ? -1 : 1})`;
    };

    cat.addEventListener("pointerdown", event => {
        dragging = true;
        cat!.style.cursor = "grabbing";
        startX = event.clientX;
        startY = event.clientY;
        originX = x;
        originY = parseFloat(cat!.style.top) || 120;
        cat!.setPointerCapture(event.pointerId);
    });

    cat.addEventListener("pointermove", event => {
        if (!dragging) return;
        x = Math.max(0, originX + event.clientX - startX);
        cat!.style.top = `${Math.max(0, originY + event.clientY - startY)}px`;
        update();
    });

    cat.addEventListener("pointerup", () => {
        dragging = false;
        cat!.style.cursor = "grab";
    });

    update();

    timer = window.setInterval(() => {
        if (!cat || dragging || !settings.autoWalk.default) {
            update();
            return;
        }

        const size = Math.max(32, Math.min(160, Number(settings.size.default) || 72));
        const maxX = Math.max(0, window.innerWidth - size - 10);
        x += direction * Math.max(.5, Number(settings.speed.default) || 1);

        if (x >= maxX) {
            x = maxX;
            direction = -1;
        } else if (x <= 0) {
            x = 0;
            direction = 1;
        }

        update();
    }, 180);
}

function destroyCat() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
    cat?.remove();
    cat = null;
    style?.remove();
    style = null;
}

export default definePlugin({
    name: "FloatingCat",
    description: "A draggable animated cat that walks across Discord.",
    authors: [Devs.Vendicated],
    settings,
    start() {
        if (settings.enabled.default) createCat();
    },
    stop() {
        destroyCat();
    },
});
