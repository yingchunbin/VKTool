(() => {
    "use strict";

    /* AUTO CLICK TUAN TU V6 - DANH SACH HANH DONG */
    const PANEL_ID = "auto-action-panel-v6";
    const MARKER_LAYER_ID = "auto-action-markers-v6";
    const STORAGE_KEY = "autoActionSavedConfigV61";
    const INSTANCE_KEY = "__AUTO_ACTION_V61_INSTANCE__";

    window[INSTANCE_KEY]?.destroy?.();
    document.getElementById(PANEL_ID)?.remove();
    document.getElementById(MARKER_LAYER_ID)?.remove();

    const controller = new AbortController();
    const { signal } = controller;

    const state = {
        actions: [],
        running: false,
        paused: false,
        assigningClick: false,
        collapsed: false,
        currentIndex: 0,
        timer: null,
        captureHandler: null,
        previousCursor: "",
        draggingPoint: false,
        destroyed: false
    };

    const clamp = (value, min, max, fallback) => {
        const number = Number(value);
        return Number.isFinite(number)
            ? Math.min(max, Math.max(min, number))
            : fallback;
    };

    const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);

    const markerLayer = document.createElement("div");
    markerLayer.id = MARKER_LAYER_ID;
    markerLayer.style.cssText = `
        position:fixed;inset:0;width:100%;height:100%;pointer-events:none;
        z-index:2147483645;
    `;
    document.documentElement.appendChild(markerLayer);

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = `
        position:fixed;top:20px;right:20px;width:390px;
        max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);
        overflow:auto;padding:14px;box-sizing:border-box;background:#fff;color:#222;
        border:2px solid #2478ff;border-radius:12px;
        box-shadow:0 8px 28px rgba(0,0,0,.28);
        font-family:Arial,sans-serif;font-size:14px;line-height:1.4;
        z-index:2147483647;
    `;

    panel.innerHTML = `
        <div id="aa-title" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;cursor:move;user-select:none;">
            <span id="aa-title-text" style="font-size:17px;font-weight:bold;">Auto tuần tự V6.1</span>
            <button id="aa-collapse" type="button" title="Thu gọn">−</button>
        </div>

        <div id="aa-content">
            <div style="padding:10px;background:#eef5ff;border:1px solid #cbdfff;border-radius:8px;">
                <strong>Thêm hành động tiếp theo</strong>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                    <button id="aa-add-click" type="button" style="background:#1769aa;color:#fff;border-color:#1769aa;">🖱 Gán vị trí</button>
                    <select id="aa-key-select" aria-label="Chọn phím" style="padding:6px;border:1px solid #999;border-radius:6px;">
                        <option value="1">Phím 1</option><option value="2">Phím 2</option>
                        <option value="3">Phím 3</option><option value="4">Phím 4</option>
                        <option value="5">Phím 5</option><option value="6">Phím 6</option>
                        <option value="7">Phím 7</option><option value="8">Phím 8</option>
                        <option value="9">Phím 9</option><option value="Enter">Phím Enter</option>
                    </select>
                    <button id="aa-add-key" type="button" style="background:#6f42c1;color:#fff;border-color:#6f42c1;">⌨ Thêm phím</button>
                </div>
                <div style="margin-top:7px;color:#555;font-size:12px;">
                    Mỗi lần bấm sẽ thêm một bước vào cuối danh sách. Có thể trộn click và phím theo bất kỳ thứ tự nào.
                </div>
            </div>

            <div style="display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap;">
                <label for="aa-delay">Chờ giữa mỗi bước:</label>
                <input id="aa-delay" type="number" min="50" max="3600000" step="50" value="1000" style="width:90px;padding:5px;border:1px solid #aaa;border-radius:5px;">
                <span>ms</span>
            </div>


            <label style="display:block;margin-top:9px;cursor:pointer;"><input id="aa-loop" type="checkbox" checked> Lặp lại toàn bộ danh sách</label>
            <label style="display:block;margin-top:6px;cursor:pointer;"><input id="aa-show-markers" type="checkbox" checked> Hiện dấu vị trí click</label>

            <div id="aa-status" style="margin-top:11px;padding:9px;background:#f1f5fa;border:1px solid #dde5ef;border-radius:7px;">Chưa có hành động nào.</div>
            <div id="aa-list" style="max-height:260px;overflow:auto;margin-top:8px;"></div>

            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
                <button id="aa-start" type="button" style="background:#188038;color:#fff;border-color:#188038;">▶ Bắt đầu</button>
                <button id="aa-pause" type="button" style="background:#e68a00;color:#fff;border-color:#e68a00;">⏸ Tạm dừng</button>
                <button id="aa-stop" type="button" style="background:#d93025;color:#fff;border-color:#d93025;">■ Dừng</button>
            </div>

            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;">
                <button id="aa-save" type="button">💾 Lưu</button>
                <button id="aa-load" type="button">📂 Tải</button>
                <button id="aa-clear" type="button">Xóa hết</button>
                <button id="aa-close" type="button">Đóng</button>
            </div>

            <div style="margin-top:10px;padding-top:8px;border-top:1px solid #ddd;color:#666;font-size:12px;">
                Dùng ↑ ↓ để đổi thứ tự. Khi dừng, có thể kéo dấu tròn để sửa tọa độ. Nhấn Esc để dừng hoặc hủy gán.
            </div>
        </div>
    `;
    document.documentElement.appendChild(panel);

    panel.querySelectorAll("button").forEach(button => {
        button.style.padding = button.id === "aa-collapse" ? "0" : "7px 10px";
        button.style.border = `1px solid ${button.style.borderColor || "#999"}`;
        button.style.borderRadius = "6px";
        button.style.cursor = "pointer";
        button.style.fontFamily = "Arial,sans-serif";
    });

    const $ = selector => panel.querySelector(selector);
    const title = $("#aa-title");
    const titleText = $("#aa-title-text");
    const content = $("#aa-content");
    const collapseButton = $("#aa-collapse");
    const addClickButton = $("#aa-add-click");
    const keySelect = $("#aa-key-select");
    const addKeyButton = $("#aa-add-key");
    const delayInput = $("#aa-delay");
    const loopInput = $("#aa-loop");
    const showMarkersInput = $("#aa-show-markers");
    const status = $("#aa-status");
    const list = $("#aa-list");
    const startButton = $("#aa-start");
    const pauseButton = $("#aa-pause");
    const stopButton = $("#aa-stop");
    const saveButton = $("#aa-save");
    const loadButton = $("#aa-load");
    const clearButton = $("#aa-clear");
    const closeButton = $("#aa-close");

    function clearTimers() {
        if (state.timer !== null) clearTimeout(state.timer);
        state.timer = null;
    }

    function updateMarkerVisibility() {
        markerLayer.style.display = showMarkersInput.checked && !state.collapsed && !state.assigningClick
            ? "block" : "none";
    }

    function cancelAssigning() {
        if (state.captureHandler) {
            document.removeEventListener("click", state.captureHandler, true);
            state.captureHandler = null;
        }
        state.assigningClick = false;
        panel.style.visibility = "visible";
        document.documentElement.style.cursor = state.previousCursor;
        updateMarkerVisibility();
    }

    function fullStop(resetIndex = true) {
        clearTimers();
        state.running = false;
        state.paused = false;
        if (resetIndex) state.currentIndex = 0;
        startButton.textContent = "▶ Bắt đầu";
        redrawMarkers();
    }

    function actionDescription(action) {
        if (action.type === "click") return `🖱 Click X: ${action.x}, Y: ${action.y}`;
        return `⌨ Bấm phím ${escapeHtml(action.key)}`;
    }

    function updateDisplay(message = "") {
        if (message) status.innerHTML = message;
        else if (state.running) status.innerHTML = `<strong style="color:#188038;">Đang chạy</strong><br>Bước tiếp theo: <strong>${state.currentIndex + 1}/${state.actions.length}</strong>`;
        else if (state.paused) status.innerHTML = `<strong style="color:#e68a00;">Đang tạm dừng</strong><br>Sẽ tiếp tục từ bước <strong>${state.currentIndex + 1}</strong>.`;
        else if (state.actions.length) status.innerHTML = `Đã tạo <strong>${state.actions.length}</strong> hành động tuần tự.`;
        else status.textContent = "Chưa có hành động nào.";

        list.innerHTML = state.actions.map((action, index) => `
            <div style="display:flex;align-items:center;gap:5px;padding:6px;margin-top:5px;background:${state.running && index === state.currentIndex ? "#dbe8ff" : "#f5f5f5"};border-radius:6px;">
                <span style="min-width:0;flex:1;overflow-wrap:anywhere;"><strong>${index + 1}.</strong> ${actionDescription(action)}</span>
                <button type="button" class="aa-up" data-index="${index}" title="Đưa lên" style="padding:2px 7px;">↑</button>
                <button type="button" class="aa-down" data-index="${index}" title="Đưa xuống" style="padding:2px 7px;">↓</button>
                <button type="button" class="aa-delete" data-index="${index}" title="Xóa" style="padding:2px 7px;color:#d93025;">×</button>
            </div>
        `).join("");

        list.querySelectorAll(".aa-up,.aa-down,.aa-delete").forEach(button => {
            button.addEventListener("click", () => {
                fullStop(true);
                const index = Number(button.dataset.index);
                if (button.classList.contains("aa-delete")) state.actions.splice(index, 1);
                else if (button.classList.contains("aa-up") && index > 0) {
                    [state.actions[index - 1], state.actions[index]] = [state.actions[index], state.actions[index - 1]];
                } else if (button.classList.contains("aa-down") && index < state.actions.length - 1) {
                    [state.actions[index + 1], state.actions[index]] = [state.actions[index], state.actions[index + 1]];
                }
                saveConfig(false);
                redrawMarkers();
                updateDisplay();
            }, { signal });
        });
    }

    function createMarker(action, actionIndex, clickNumber) {
        const marker = document.createElement("div");
        marker.textContent = clickNumber;
        marker.style.cssText = `
            position:fixed;left:${action.x - 15}px;top:${action.y - 15}px;
            width:30px;height:30px;display:flex;align-items:center;justify-content:center;
            box-sizing:border-box;color:#fff;background:rgba(220,30,30,.9);
            border:2px solid #fff;border-radius:50%;font:bold 13px Arial;
            pointer-events:${state.running ? "none" : "auto"};
            cursor:${state.running ? "default" : "grab"};user-select:none;touch-action:none;
            box-shadow:0 2px 7px rgba(0,0,0,.5);
        `;
        marker.title = `Hành động ${actionIndex + 1}: click ${action.x}, ${action.y}`;

        marker.addEventListener("mousedown", event => {
            if (state.running || state.assigningClick || event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            state.draggingPoint = true;
            marker.style.background = "rgba(20,120,240,.95)";

            const move = moveEvent => {
                if (!state.draggingPoint) return;
                const current = state.actions[actionIndex];
                if (!current || current.type !== "click") return;
                current.x = Math.round(clamp(moveEvent.clientX, 0, window.innerWidth, 0));
                current.y = Math.round(clamp(moveEvent.clientY, 0, window.innerHeight, 0));
                marker.style.left = `${current.x - 15}px`;
                marker.style.top = `${current.y - 15}px`;
                status.innerHTML = `Đang sửa hành động <strong>${actionIndex + 1}</strong><br>X: ${current.x}, Y: ${current.y}`;
            };

            const finish = () => {
                if (!state.draggingPoint) return;
                state.draggingPoint = false;
                document.removeEventListener("mousemove", move, true);
                document.removeEventListener("mouseup", finish, true);
                saveConfig(false);
                redrawMarkers();
                updateDisplay();
            };

            document.addEventListener("mousemove", move, true);
            document.addEventListener("mouseup", finish, true);
        }, { signal });
        markerLayer.appendChild(marker);
    }

    function redrawMarkers() {
        markerLayer.innerHTML = "";
        let clickNumber = 0;
        state.actions.forEach((action, index) => {
            if (action.type === "click") createMarker(action, index, ++clickNumber);
        });
        updateMarkerVisibility();
    }

    function performClick(action) {
        const oldPanel = panel.style.display;
        const oldMarkers = markerLayer.style.display;
        panel.style.display = "none";
        markerLayer.style.display = "none";
        const target = document.elementFromPoint(action.x, action.y);
        panel.style.display = oldPanel || "block";
        markerLayer.style.display = oldMarkers || "block";
        updateMarkerVisibility();
        if (!target) return false;

        const options = {
            bubbles:true,cancelable:true,composed:true,view:window,
            clientX:action.x,clientY:action.y,
            screenX:window.screenX + action.x,screenY:window.screenY + action.y,
            button:0
        };
        try { target.dispatchEvent(new PointerEvent("pointerdown", {...options,buttons:1,pointerId:1,pointerType:"mouse",isPrimary:true})); } catch {}
        target.dispatchEvent(new MouseEvent("mousedown", {...options,buttons:1}));
        try { target.dispatchEvent(new PointerEvent("pointerup", {...options,buttons:0,pointerId:1,pointerType:"mouse",isPrimary:true})); } catch {}
        target.dispatchEvent(new MouseEvent("mouseup", {...options,buttons:0}));
        target.dispatchEvent(new MouseEvent("click", {...options,buttons:0}));
        return true;
    }

    function keyboardInfo(key) {
        return key === "Enter"
            ? { key:"Enter", code:"Enter", keyCode:13 }
            : { key, code:`Digit${key}`, keyCode:key.charCodeAt(0) };
    }

    function dispatchKey(target, type, info) {
        const event = new KeyboardEvent(type, {
            key:info.key,code:info.code,bubbles:true,cancelable:true,composed:true
        });
        try {
            Object.defineProperties(event, {
                keyCode:{configurable:true,get:()=>info.keyCode},
                which:{configurable:true,get:()=>info.keyCode},
                charCode:{configurable:true,get:()=>type === "keypress" ? info.keyCode : 0}
            });
        } catch {}
        target.dispatchEvent(event);
    }

    function performKey(key) {
        const info = keyboardInfo(key);
        const active = document.activeElement;
        const targets = active && active !== document.body && active !== document.documentElement && !panel.contains(active)
            ? [active] : [document, window];
        targets.forEach(target => {
            dispatchKey(target, "keydown", info);
            dispatchKey(target, "keypress", info);
        });
        /* Bam phim mot lan theo thao tac thong thuong: nhan roi nha ngay. */
        targets.forEach(target => dispatchKey(target, "keyup", info));
    }

    function runNext() {
        if (!state.running || !state.actions.length || state.destroyed) return;
        if (state.currentIndex >= state.actions.length) state.currentIndex = 0;
        updateDisplay();
        const action = state.actions[state.currentIndex];
        if (action.type === "click") performClick(action);
        else performKey(action.key);
        state.currentIndex++;

        if (state.currentIndex >= state.actions.length) {
            if (!loopInput.checked) {
                state.timer = setTimeout(() => {
                    fullStop(true);
                    updateDisplay("Đã chạy xong toàn bộ danh sách.");
                }, 20);
                return;
            }
            state.currentIndex = 0;
        }
        state.timer = setTimeout(runNext, clamp(delayInput.value, 50, 3600000, 1000));
    }

    function saveConfig(showMessage = true) {
        const config = {
            actions: state.actions,
            delay: clamp(delayInput.value, 50, 3600000, 1000),
            loop: loopInput.checked,
            showMarkers: showMarkersInput.checked
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            if (showMessage) updateDisplay(`Đã lưu <strong>${state.actions.length}</strong> hành động.`);
            return true;
        } catch (error) {
            console.error(error);
            if (showMessage) updateDisplay("Không thể lưu cấu hình trên website này.");
            return false;
        }
    }

    function loadConfig(showMessage = true) {
        fullStop(true);
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                if (showMessage) updateDisplay("Chưa có cấu hình V6 đã lưu.");
                return false;
            }
            const config = JSON.parse(raw);
            state.actions = Array.isArray(config.actions) ? config.actions.filter(action => {
                return action?.type === "click"
                    ? Number.isFinite(action.x) && Number.isFinite(action.y)
                    : action?.type === "key" && (/^[1-9]$/.test(action.key) || action.key === "Enter");
            }).map(action => action.type === "click"
                ? {type:"click",x:Math.round(action.x),y:Math.round(action.y)}
                : {type:"key",key:action.key}) : [];
            delayInput.value = clamp(config.delay, 50, 3600000, 1000);
            loopInput.checked = config.loop !== false;
            showMarkersInput.checked = config.showMarkers !== false;
            redrawMarkers();
            updateDisplay(showMessage ? `Đã tải <strong>${state.actions.length}</strong> hành động.` : "");
            return true;
        } catch (error) {
            console.error(error);
            if (showMessage) updateDisplay("Cấu hình đã lưu không hợp lệ.");
            return false;
        }
    }

    function destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        cancelAssigning();
        clearTimers();
        controller.abort();
        markerLayer.remove();
        panel.remove();
        if (window[INSTANCE_KEY]?.destroy === destroy) delete window[INSTANCE_KEY];
    }
    window[INSTANCE_KEY] = { destroy };

    addClickButton.addEventListener("click", event => {
        event.preventDefault();
        fullStop(true);
        cancelAssigning();
        state.assigningClick = true;
        state.previousCursor = document.documentElement.style.cursor;
        panel.style.visibility = "hidden";
        markerLayer.style.display = "none";
        document.documentElement.style.cursor = "crosshair";

        state.captureHandler = clickEvent => {
            clickEvent.preventDefault();
            clickEvent.stopPropagation();
            clickEvent.stopImmediatePropagation();
            const action = {type:"click",x:Math.round(clickEvent.clientX),y:Math.round(clickEvent.clientY)};
            cancelAssigning();
            state.actions.push(action);
            saveConfig(false);
            redrawMarkers();
            updateDisplay(`Đã thêm bước <strong>${state.actions.length}</strong>: click X: ${action.x}, Y: ${action.y}.`);
        };
        setTimeout(() => {
            if (state.assigningClick && state.captureHandler) document.addEventListener("click", state.captureHandler, true);
        }, 100);
    }, { signal });

    addKeyButton.addEventListener("click", () => {
        fullStop(true);
        const key = keySelect.value;
        state.actions.push({type:"key",key});
        saveConfig(false);
        redrawMarkers();
        updateDisplay(`Đã thêm bước <strong>${state.actions.length}</strong>: bấm phím <strong>${escapeHtml(key)}</strong>.`);
    }, { signal });

    startButton.addEventListener("click", () => {
        cancelAssigning();
        if (state.running) return updateDisplay("Danh sách đang chạy.");
        if (!state.actions.length) return updateDisplay("Bạn chưa thêm hành động nào.");
        if (!state.paused) state.currentIndex = 0;
        if (state.currentIndex >= state.actions.length) state.currentIndex = 0;
        state.running = true;
        state.paused = false;
        startButton.textContent = "▶ Bắt đầu";
        redrawMarkers();
        saveConfig(false);
        runNext();
    }, { signal });

    pauseButton.addEventListener("click", () => {
        cancelAssigning();
        if (!state.running) return updateDisplay(state.paused ? "Danh sách đang tạm dừng." : "Danh sách chưa chạy.");
        clearTimers();
        state.running = false;
        state.paused = true;
        startButton.textContent = "▶ Tiếp tục";
        redrawMarkers();
        updateDisplay();
    }, { signal });

    stopButton.addEventListener("click", () => {
        cancelAssigning();
        fullStop(true);
        updateDisplay("<strong>Đã dừng.</strong> Lần chạy sau bắt đầu từ bước 1.");
    }, { signal });

    saveButton.addEventListener("click", () => saveConfig(true), { signal });
    loadButton.addEventListener("click", () => loadConfig(true), { signal });
    clearButton.addEventListener("click", () => {
        fullStop(true);
        state.actions = [];
        saveConfig(false);
        redrawMarkers();
        updateDisplay("Đã xóa toàn bộ danh sách.");
    }, { signal });
    closeButton.addEventListener("click", destroy, { signal });

    [delayInput, loopInput].forEach(input => input.addEventListener("change", () => saveConfig(false), { signal }));
    showMarkersInput.addEventListener("change", () => { updateMarkerVisibility(); saveConfig(false); }, { signal });

    collapseButton.addEventListener("click", event => {
        event.stopPropagation();
        state.collapsed = !state.collapsed;
        if (state.collapsed) {
            content.style.display = "none";
            titleText.style.display = "none";
            panel.style.width = "58px";
            panel.style.padding = "6px";
            panel.style.overflow = "hidden";
            title.style.display = "block";
            title.style.marginBottom = "0";
            collapseButton.textContent = "AC";
            collapseButton.style.width = "100%";
            collapseButton.style.height = "40px";
        } else {
            content.style.display = "block";
            titleText.style.display = "inline";
            panel.style.width = "390px";
            panel.style.padding = "14px";
            panel.style.overflow = "auto";
            title.style.display = "flex";
            title.style.marginBottom = "12px";
            collapseButton.textContent = "−";
        }
        updateMarkerVisibility();
    }, { signal });

    let draggingPanel = false;
    let offsetX = 0;
    let offsetY = 0;
    title.addEventListener("mousedown", event => {
        if (event.target.closest("#aa-collapse") || event.button !== 0) return;
        draggingPanel = true;
        const rect = panel.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;
        event.preventDefault();
    }, { signal });
    document.addEventListener("mousemove", event => {
        if (!draggingPanel) return;
        panel.style.left = `${clamp(event.clientX - offsetX, 0, Math.max(0, window.innerWidth - panel.offsetWidth), 0)}px`;
        panel.style.top = `${clamp(event.clientY - offsetY, 0, Math.max(0, window.innerHeight - panel.offsetHeight), 0)}px`;
        panel.style.right = "auto";
    }, { signal });
    document.addEventListener("mouseup", () => { draggingPanel = false; }, { signal });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (state.assigningClick) {
            cancelAssigning();
            updateDisplay("Đã hủy gán vị trí.");
        } else {
            fullStop(true);
            updateDisplay("Đã dừng bằng phím Esc.");
        }
    }, { signal });

    const loaded = loadConfig(false);
    if (loaded && state.actions.length) updateDisplay(`Đã tự động tải <strong>${state.actions.length}</strong> hành động cũ.`);
    else updateDisplay();
    console.log("Auto tuần tự V6.1 đã khởi động.");
})();
