// =====================================================
//   Powered by WANG CONG / 2026-08-10 / 116628442@qq.com

//   1. 优先尝试本地 file:///C:/Windows/mind.js
//   2. 本地不存在时，从 CDN 加载依赖库：
//      - https://fastly.jsdelivr.net/npm/d3@7
//      - https://fastly.jsdelivr.net/npm/markmap-view@0.16
//      - https://fastly.jsdelivr.net/npm/markmap-lib@0.16 
// =====================================================

window.MINDMAP_CONFIG = {
    // 本地库文件夹路径
    localLibraryDir: 'file:///C:/Windows/mind/',
    
    // 工具栏参数
    ui: {
        toolbarWidth: '136px',
        formatBtnBg: '#0dcaf0',
        formatBtnText: '#212529',
        printGroupMarginTop: '8px',
        printGroupMarginBottom: '8px',
        editBoxOffsetX: 15,
        editBoxOffsetY: 10
    },
    symbols: {
        punctuations: "。！？.!?，；、,;：:",
        words: ["和", "或者", "或", "and", "or"],
        connectors: "-/&_—",
        pairs: ["()", "（）", "[]", "【】", "{}", "《》", "\"\"", "“”", "''", "‘’"]
    }
};

window.formatInputState = {}; 
window.manualFormatStates = {};
window.isManualPrintOrientation = false;

document.addEventListener('DOMContentLoaded', () => {
    const css = `
        body, html { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: #f8f9fa; font-family: sans-serif; }
        #mindmap-container { width: 100vw; height: 100vh; position: absolute; top:0; left:0; z-index: 1; overflow: hidden; user-select: none; -webkit-user-select: none; }
        #mindmap-svg, #mindmap-svg-left { width: 100%; height: 100%; position: absolute; top:0; left:0; }
        #mindmap-svg { user-select: none; -webkit-user-select: none; }
        #mindmap-svg * { user-select: none; -webkit-user-select: none; }
        #mindmap-svg-left { pointer-events: none; user-select: none; -webkit-user-select: none; }
        #mindmap-svg-left * { pointer-events: auto; user-select: none; -webkit-user-select: none; }
        #edit-container, #edit-container * { user-select: text; -webkit-user-select: text; }
        
        /* 核心执行 1：右侧各级节点文字向父节点(左)移动半个字符 (7px) */
        #mindmap-svg .markmap-node:not([data-depth="1"]) > foreignObject,
        #mindmap-svg .markmap-node:not([data-depth="1"]) > text {
            transform: translateX(-7px) !important;
        }

        /* 核心执行 1：左侧各级节点文字镜像翻转对齐后，向父节点(视觉右)移动半个字符 (7px) */
        #mindmap-svg-left .markmap-node:not([data-depth="1"]) > foreignObject,
        #mindmap-svg-left .markmap-node:not([data-depth="1"]) > text {
            transform: scaleX(-1) translateX(-100%) translateX(7px) !important;
            transform-origin: 0 0;
            transform-box: fill-box;
            text-align: left !important;
        }

        #mindmap-svg-left .markmap-node > circle { transform: scaleX(-1) scale(0.8); transform-origin: center; transform-box: fill-box; }
        
        /* 隐藏左侧虚拟根节点内容（保留 circle 用于折叠） */
        #mindmap-svg-left .markmap-node[data-depth="1"] > foreignObject,
        #mindmap-svg-left .markmap-node[data-depth="1"] > text,
        #mindmap-svg-left .markmap-node[data-depth="1"] > line {
            opacity: 0 !important;
            pointer-events: none;
        }
        
        .markmap-node circle { r: 3.2px !important; transform: scale(0.8); transform-origin: center; transform-box: fill-box; }
        .markmap-node { cursor: pointer; transition: opacity 0.2s; }
        .markmap-node:hover text { fill: #ff4d4f !important; font-weight: bold; }
        b, strong { font-weight: bold !important; }
        i, em { font-style: italic !important; }
        #toolbar, #toolbar * { box-sizing: border-box; }
        #toolbar { position: fixed; top: 5px; right: 5px; z-index: 999; display: flex; flex-direction: column; gap: 4px; width: ${window.MINDMAP_CONFIG.ui.toolbarWidth}; max-height: 98vh; overflow: hidden; }
        #dynamic-format-container { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; flex: 1; min-height: 0; padding-right: 2px; margin-right: -2px; }
        #dynamic-format-container::-webkit-scrollbar { width: 4px; }
        #dynamic-format-container::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        .history-controls { display: flex; gap: 5px; width: 100%; flex-shrink: 0; }
        .btn { background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn:hover:not(:disabled) { background-color: #0056b3; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.6; cursor: wait; }
        #restore-btn { flex: 1; height: 28px; }
        .icon-btn { width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; background-color: #fff; border: 1px solid #ddd; cursor: pointer; display: flex; justify-content: center; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.08); color: #555; padding: 0; }
        .icon-btn:hover:not(:disabled) { border-color: #007bff; color: #007bff; }
        .icon-btn svg { width: 14px; height: 14px; pointer-events: none; display: block; }
        .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; background-color: #fafafa; }
        .print-panel { display: flex; flex-direction: column; gap: 5px; background: #fff; padding: 6px; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border: 1px solid #ddd; width: 100%; flex-shrink: 0; }
        .print-row { display: flex; gap: 5px; width: 100%; }
        .print-row > * { flex: 1; height: 26px; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .scale-wrapper { display: flex; align-items: center; border: 1px solid #ccc; border-radius: 4px; background: #fff; overflow: hidden; }
        .scale-wrapper:focus-within { border-color: #007bff; }
        .scale-wrapper input { flex: 1; width: 100%; border: none; outline: none; text-align: center; font-size: 12px; padding: 0; background: transparent; }
        .scale-wrapper span { font-size: 12px; font-weight: bold; color: #555; padding-right: 2px; }
        .branch-reset-btn { cursor: pointer; transition: opacity 0.2s; }
        .branch-reset-btn:hover { opacity: 0.7; }
        .adjust-btn { background: transparent; border: none; cursor: pointer; color: #0d6efd; font-weight: bold; font-size: 15px; width: 22px; height: 22px; padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: "Microsoft YaHei", sans-serif; line-height: 1; }
        .left-len-btn { background: transparent; border: none; cursor: pointer; color: #000; font-weight: bold; font-size: 15px; width: 22px; height: 22px; padding: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: "Microsoft YaHei", sans-serif; line-height: 1; }
        .left-len-btn:hover { background-color: #e9ecef !important; border-radius: 3px; transform: scale(1.15); }
        .left-len-btn:active { transform: scale(0.9); }
        .adjust-btn:hover { background-color: #e9ecef !important; border-radius: 3px; transform: scale(1.15); }
        .adjust-btn:active { transform: scale(0.9); }
        .narrow-btn { padding-right: 3px !important; }
        .widen-btn { padding-left: 3px !important; }
        .print-action-btn { background-color: #198754; border-radius: 4px; font-size: 12px; }
        .print-action-btn:hover { background-color: #157347; }
        .print-toggle { border: 1px solid #ccc; background: #f8f9fa; cursor: pointer; border-radius: 4px; color: #555; transition: all 0.2s; font-size: 11px; display: flex; justify-content: center; align-items: center; padding: 0; }
        .print-toggle.active { background: #0d6efd; color: white; border-color: #0d6efd; font-weight: bold; }
        .gray-btn-style { background-color: #f1f3f5 !important; color: #495057 !important; border: 1px solid #ced4da !important; font-weight: normal !important; border-radius: 4px !important; }
        .gray-btn-style:hover:not(:disabled) { background-color: #e2e6ea !important; color: #212529 !important; }
        .rich-btn { height: 26px; padding: 0 8px; background: #fff; border: 2px solid #ced4da; border-radius: 4px; cursor: pointer; font-weight: bold; color: #6c757d; font-size: 13px; transition: all 0.15s; outline: none; box-shadow: 0 4px 8px rgba(0,0,0,0.1); white-space: nowrap; }
        .rich-btn:hover { border-color: #adb5bd; color: #495057; background: #f8f9fa; }
        .rich-btn.active.hl-btn { background: #ffe5e5; border-color: #dc3545; color: #dc3545; box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3); }
        .rich-btn.active.italic-btn { background: #e7f1ff; border-color: #0d6efd; color: #0d6efd; box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2); }
        .add-btn { background: #d1e7dd !important; color: #0f5132 !important; border-color: #badbcc !important; margin-left: 8px; }
        .add-btn:hover { background: #badbcc !important; }
        .del-btn { background: #ffe5e5 !important; color: #dc3545 !important; border-color: #f5c2c7 !important; font-weight: bold; text-decoration: line-through double; }
        .del-btn:hover { background: #f8d7da !important; color: #b02a37 !important; }
        @keyframes blinkFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.1; } }
        .blink-red { animation: blinkFlash 0.15s ease-in-out 1; } .blink-red text { fill: #dc3545 !important; font-weight: bold; } .blink-red path, .blink-red line, .blink-red circle { stroke: #dc3545 !important; }
        .blink-green { animation: blinkFlash 0.15s ease-in-out 1; } .blink-green text { fill: #198754 !important; font-weight: bold; } .blink-green path, .blink-green line, .blink-green circle { stroke: #198754 !important; }
        @keyframes blinkRedBg { 0%, 100% { filter: none; } 50% { filter: brightness(1.3) drop-shadow(0 0 8px rgba(220, 53, 69, 0.95)); } }
        .blink-red-drag { animation: blinkRedBg 0.4s ease-in-out 4; }
        .blink-red-drag text { fill: #dc3545 !important; font-weight: bold; }
        .blink-red-drag path, .blink-red-drag line, .blink-red-drag circle { stroke: #dc3545 !important; }
        .drag-ghost { position: fixed; z-index: 99999; pointer-events: none; background-color: rgba(255, 255, 255, 0.95); border: 2px dashed #ffc107; padding: 4px 10px; border-radius: 4px; font-size: 13px; color: #b8860b; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    `;
    document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
    
    document.body.insertAdjacentHTML('beforeend', `
        <div id="toolbar">
            <div class="history-controls">
                <button class="btn" id="restore-btn">重置</button>
                <button class="icon-btn" id="undo-btn" disabled><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C20.71 11.03 16.98 8 12.5 8z"/></svg></button>
                <button class="icon-btn" id="redo-btn" disabled><svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.5 8c-4.48 0-8.21 3.03-9.57 7.22l2.37.78c1.05-3.19 4.06-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13.4 16h9V7l-3.6 3.6c-1.84-1.61-4.24-2.6-6.9-2.6z"/></svg></button>
            </div>
            <button class="btn" id="change-color-btn" style="min-height: 28px; width: 100%; flex-shrink: 0;">更换配色方案</button>
            <div class="print-panel" style="margin-top: ${window.MINDMAP_CONFIG.ui.printGroupMarginTop}; margin-bottom: ${window.MINDMAP_CONFIG.ui.printGroupMarginBottom};">
                <div class="print-row">
                    <button class="btn print-action-btn" id="print-btn">打印</button>
                    <div class="scale-wrapper">
                        <input type="number" id="print-scale" value="100">
                        <span>%</span>
                    </div>
                </div>
                <div class="print-row">
                    <button class="print-toggle active" id="btn-portrait">纵向</button>
                    <button class="print-toggle" id="btn-landscape">横向</button>
                </div>
                <div class="print-row" style="margin-top: 2px;">
                    <button class="btn gray-btn-style" id="save-png-btn">导出PNG</button>
                    <div class="scale-wrapper">
                        <input type="number" id="png-scale" value="1" step="0.5">
                        <span>倍</span>
                    </div>
                </div>
            </div>
            <div id="dynamic-format-container"></div>
        </div>
        <div id="mindmap-container">
            <svg id="mindmap-svg"></svg>
            <svg id="mindmap-svg-left"></svg>
        </div>
    `);

    async function boot() {
        if (window.__MINDMAP_BOOTED) {
            if (window.markmap && window.d3) {
                runMindMapLogic();
            } else {
                alert("严重错误：离线依赖库丢失！\n\n您可能在代码替换时误删了 mind.js 底部的 d3 和 markmap 库。\n请勿删除底部乱码代码，或保持网络畅通以从 CDN 自动拉取。");
            }
            return;
        }
        window.__MINDMAP_BOOTED = true;

        if (window.markmap && window.d3) {
            runMindMapLogic();
            return;
        }

        const localOk = await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'file:///C:/Windows/mind.js';
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
        });

        if (localOk) {
            await new Promise(r => setTimeout(r, 50));
            if (window.markmap && window.d3) {
                return;
            } else {
                console.warn("本地 mind.js 丢失了离线库代码，尝试回退到 CDN 加载...");
            }
        }

        const loadScript = (src) => new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve(true);
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
        });

        const d3Ok   = await loadScript('https://fastly.jsdelivr.net/npm/d3@7');
        const viewOk = await loadScript('https://fastly.jsdelivr.net/npm/markmap-view@0.16');
        const libOk  = await loadScript('https://fastly.jsdelivr.net/npm/markmap-lib@0.16');

        if (d3Ok && viewOk && libOk) {
            runMindMapLogic();
        } else {
            alert("致命错误：无法加载脑图依赖库！\n\n请检查网络连接，或将缺失的离线库代码补回您的本地文件中！");
        }
    }
    boot();
});

function runMindMapLogic() {
    const mdEl = document.getElementById('md');
    if(!mdEl) return; 
    
    const colorSchemes = [
        ['#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#ff7f0e', '#e377c2', '#8c564b', '#17becf'],
        ['#e6194B', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#a9a9a9'],
        ['#FF3B30', '#34C759', '#007AFF', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#8B4513'],
        ['#F94144', '#90BE6D', '#F3722C', '#577590', '#F8961E', '#43AA8B', '#277DA1', '#6D597A'],
        ['#8A2BE2', '#00FF7F', '#FF4500', '#1E90FF', '#FF1493', '#00CED1', '#CD5C5C', '#32CD32'],
        ['#E76F51', '#2A9D8F', '#F4A261', '#264653', '#84A59D', '#F28482'],
        ['#e41a1c', '#4daf4a', '#377eb8', '#ff7f00', '#984ea3', '#a65628', '#f781bf']
    ];
    
    let currentSchemeIndex = parseInt(localStorage.getItem('mindmap_global_color_index') || '0', 10);
    if (isNaN(currentSchemeIndex) || currentSchemeIndex >= colorSchemes.length) currentSchemeIndex = 0;
    
    let currentColorScale = d3.scaleOrdinal(colorSchemes[currentSchemeIndex]);
    
    const customColorFn = (node) => {
        const data = node.data || node;
        if (data._branchColorIndex !== undefined && data._branchColorIndex !== null) {
            return currentColorScale(data._branchColorIndex);
        }
        return '#212529'; 
    };

    const markdownText = mdEl.value.trim().replace(/<br\s*\/?>/gi, ' ');
    
    const generateHash = (str) => {
        let hash = 0; for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
        return 'markmap_state_' + hash;
    };
    const STORAGE_KEY = generateHash(markdownText);
    
    const { Transformer, Markmap, deriveOptions } = window.markmap;
    const transformer = new Transformer();
    const containerEl = document.getElementById('mindmap-container');
    const svgEl = document.getElementById('mindmap-svg');
    const svgLeftEl = document.getElementById('mindmap-svg-left');

    const baseConfig = Object.assign({ duration: 0, spacingHorizontal: 35 }, { zoom: false, pan: false, autoFit: false });
    const leftConfig = Object.assign({ duration: 0, spacingHorizontal: 35 }, { zoom: false, pan: false, autoFit: false });
    const mm = Markmap.create(svgEl, baseConfig);
    const mmLeft = Markmap.create(svgLeftEl, leftConfig);
    window.__mmRight = mm; window.__mmLeft = mmLeft;

    function getLeftShiftUnits() {
        const lr = document.querySelector('#mindmap-svg-left g.markmap-node[data-depth="1"] foreignObject');
        if (!lr) return 0;
        const lx = parseFloat(lr.getAttribute('x')) || 0;
        const lw = parseFloat(lr.getAttribute('width')) || 0;
        return 2 * lx + lw;
    }

    window.__zoomBehavior = d3.zoom().on('zoom', function(e) {
        mm.g.attr('transform', e.transform);
        const shift = getLeftShiftUnits() * e.transform.k;
        mmLeft.g.attr('transform', 'translate(' + (e.transform.x + shift) + ',' + e.transform.y + ') scale(' + e.transform.k + ') scale(-1, 1)');
    });
    d3.select(containerEl).call(window.__zoomBehavior).on('dblclick.zoom', null);
    
    function customFit() {
        const svgW = window.innerWidth; const svgH = window.innerHeight;
        let gRightBBox = {x: 0, y: 0, width: 0, height: 0}; let gLeftBBox = {x: 0, y: 0, width: 0, height: 0};
        try { 
            let box = mm.g.node().getBBox(); 
            if(!isNaN(box.width) && !isNaN(box.height)) gRightBBox = box;
        } catch(e) {} 
        
        const hasLeftNodes = !!document.querySelector('#mindmap-svg-left .markmap-node[data-depth="2"]');
        if (hasLeftNodes) { 
            try { 
                let box = mmLeft.g.node().getBBox(); 
                if(!isNaN(box.width) && !isNaN(box.height)) gLeftBBox = box;
            } catch(e) {} 
        }
        
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        if (gRightBBox.width > 0 || gRightBBox.height > 0) {
            minX = Math.min(minX, gRightBBox.x); maxX = Math.max(maxX, gRightBBox.x + gRightBBox.width);
            minY = Math.min(minY, gRightBBox.y); maxY = Math.max(maxY, gRightBBox.y + gRightBBox.height);
        }
        if (hasLeftNodes && (gLeftBBox.width > 0 || gLeftBBox.height > 0)) {
            const ls = getLeftShiftUnits();
            minX = Math.min(minX, -gLeftBBox.x - gLeftBBox.width + ls); maxX = Math.max(maxX, -gLeftBBox.x + ls);
            minY = Math.min(minY, gLeftBBox.y); maxY = Math.max(maxY, gLeftBBox.y + gLeftBBox.height);
        }
        
        const contentW = Math.max(1, maxX - minX); const contentH = Math.max(1, maxY - minY);
        if (isNaN(contentW) || isNaN(contentH) || contentW === 0 || contentH === 0) return;
        
        const scale = Math.min(svgW / contentW * 0.9, svgH / contentH * 0.9, 2);
        const tx = svgW / 2 - (minX + maxX) / 2 * scale; const ty = svgH / 2 - (minY + maxY) / 2 * scale;
        
        if (isNaN(scale) || isNaN(tx) || isNaN(ty)) return;
        d3.select(containerEl).transition().duration(200).call(window.__zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
    window.customFit = customFit;
    
    let rootData = null, originalRootData = null, idCounter = 0;
    let historyStack = [], currentHistoryIndex = -1;
    let isAnimating = false, isDragging = false, mouseDownPos = { x: 0, y: 0 };

    let dragState = { isDown: false, isDragging: false, startX: 0, startY: 0, nodeG: null, nodeId: null, ghostEl: null };

    function findParentAndIndex(node, targetId) {
        if (!node) return null;
        const keys = ['children', '_children'];
        for (const k of keys) {
            const arr = node[k];
            if (arr) {
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i]._id === targetId) return { parent: node, key: k, index: i };
                }
                for (let j = 0; j < arr.length; j++) {
                    const res = findParentAndIndex(arr[j], targetId);
                    if (res) return res;
                }
            }
        }
        return null;
    }

    function findNodeById(node, targetId) {
        if (!node) return null;
        if (node._id === targetId) return node;
        const c = node.children || node._children;
        if (c) { for (const ch of c) { const r = findNodeById(ch, targetId); if (r) return r; } }
        return null;
    }

    function isInsideSubtree(root, ancestorId, targetId) {
        const anc = findNodeById(root, ancestorId);
        if (!anc) return false;
        return !!findNodeById(anc, targetId);
    }

    function isSameParent(root, idA, idB) {
        const pa = findParentAndIndex(root, idA);
        const pb = findParentAndIndex(root, idB);
        if (!pa || !pb) return false;
        return pa.parent === pb.parent;
    }

    function reorderSiblings(root, nodeId, pointerY) {
        const found = findParentAndIndex(root, nodeId);
        if (!found) return false;
        const allSiblings = found.parent[found.key];
        if (!allSiblings || allSiblings.length < 2) return false;

        const nodeToMove = allSiblings[found.index];
        const isLeft = !!nodeToMove._isLeft;
        
        const sideSiblings = allSiblings.filter(s => !!s._isLeft === isLeft);
        if (sideSiblings.length < 2) return false;

        const withY = [];
        let anyVisible = false;
        d3.selectAll('.markmap-node').each(function(d) {
            if (!d || !d.data) return;
            const id = d.data._id;
            if (sideSiblings.some(s => s._id === id)) {
                try {
                    const r = this.getBoundingClientRect();
                    withY.push({ id, y: r.top + r.height / 2 });
                    anyVisible = true;
                } catch(e) {}
            }
        });
        if (!anyVisible) return false;

        let insertIndex = sideSiblings.length;
        for (let j = 0; j < sideSiblings.length; j++) {
            const yw = withY.find(w => w.id === sideSiblings[j]._id);
            if (yw && yw.y > pointerY) { insertIndex = j; break; }
        }
        
        const selfIndex = sideSiblings.findIndex(s => s._id === nodeId);
        let targetIndex = insertIndex;
        if (selfIndex < insertIndex) targetIndex = insertIndex - 1;
        if (targetIndex === selfIndex) return false;

        sideSiblings.splice(selfIndex, 1);
        sideSiblings.splice(targetIndex, 0, nodeToMove);

        let sideIdx = 0;
        for (let i = 0; i < allSiblings.length; i++) {
            if (!!allSiblings[i]._isLeft === isLeft) {
                allSiblings[i] = sideSiblings[sideIdx++];
            }
        }
        return true;
    }

    function reparentNode(root, nodeId, newParentId, isLeftward = false) {
        const found = findParentAndIndex(root, nodeId);
        const parentNode = findNodeById(root, newParentId);
        if (!found || !parentNode) return false;
        const node = found.parent[found.key][found.index];
        found.parent[found.key].splice(found.index, 1);
        if (found.parent[found.key].length === 0) { delete found.parent[found.key]; }
        if (parentNode === root) {
            node._isLeft = isLeftward;
            if (found.parent !== root) {
                delete node._branchColorIndex; 
            }
        }
        if (parentNode._children && !parentNode.children) {
            if (!parentNode._children) parentNode._children = [];
            parentNode._children.push(node);
        } else {
            if (!parentNode.children) parentNode.children = [];
            parentNode.children.push(node);
        }
        return true;
    }

    function moveNodeAcrossSide(root, nodeId, isLeftward) {
        const found = findParentAndIndex(root, nodeId);
        if (!found) return false;
        const node = found.parent[found.key][found.index];
        if (found.parent === root) {
            if (node._isLeft === isLeftward) return false;
            node._isLeft = isLeftward;
            return true;
        }
        found.parent[found.key].splice(found.index, 1);
        if (found.parent[found.key].length === 0) { delete found.parent[found.key]; }
        node._isLeft = isLeftward;
        delete node._branchColorIndex; 
        if (!root.children) root.children = [];
        root.children.push(node);
        return true;
    }

    function flashNodeRed(nodeId) {
        try {
            const sel = d3.selectAll('.markmap-node').filter(d => d && d.data && d.data._id === nodeId);
            sel.classed('blink-red-drag', true);
            setTimeout(() => { sel.classed('blink-red-drag', false); }, 1700);
        } catch(e) {}
    }

    [svgEl, svgLeftEl].forEach((el) => el.addEventListener('mousedown', (e) => {
        mouseDownPos = { x: e.clientX, y: e.clientY };
        isDragging = false;
        dragState.isDown = false;
        dragState.isDragging = false;
        if (e.button !== 0) return;
        const nodeG = e.target.closest('.markmap-node');
        if (!nodeG) return;
        const d3Node = d3.select(nodeG).datum();
        if (!d3Node || !d3Node.data || d3Node.depth === 0) return; 
        dragState.isDown = true;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.nodeG = nodeG;
        dragState.nodeId = d3Node.data._id;
    }, true));

    window.addEventListener('mousemove', (e) => {
        if (!dragState.isDown) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        if (!dragState.isDragging && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            dragState.isDragging = true;
            isDragging = true;
            let textStr = "";
            const d3Node = d3.select(dragState.nodeG).datum();
            if (d3Node && d3Node.data) textStr = d3Node.data.content.replace(/<[^>]+>/g, '').trim();
            if (!textStr) textStr = "节点移动中...";
            if (dragState.ghostEl) dragState.ghostEl.remove();
            dragState.ghostEl = document.createElement('div');
            dragState.ghostEl.className = 'drag-ghost';
            dragState.ghostEl.innerText = textStr;
            document.body.appendChild(dragState.ghostEl);
            dragState.nodeG.style.opacity = '0.3';
        }
        if (dragState.isDragging && dragState.ghostEl) {
            dragState.ghostEl.style.left = (e.clientX + 12) + 'px';
            dragState.ghostEl.style.top = (e.clientY + 12) + 'px';
        }
    }, true);

    window.addEventListener('mouseup', (e) => {
        if (!dragState.isDown) return;
        if (dragState.isDragging) {
            e.stopPropagation(); e.preventDefault();
            if (dragState.ghostEl) { dragState.ghostEl.remove(); dragState.ghostEl = null; }
            if (dragState.nodeG) dragState.nodeG.style.opacity = '1';
            const movedNodeId = dragState.nodeId;
            const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
            prepareData(targetRootData);
            let isChanged = false;

            if (movedNodeId) {
                const rootDOM = document.querySelector('#mindmap-svg .markmap-node[data-depth="1"]');
                let rootCenterX = window.innerWidth / 2;
                if (rootDOM) { const rect = rootDOM.getBoundingClientRect(); rootCenterX = rect.left + rect.width / 2; }
                const startLeft = dragState.startX < rootCenterX;
                const endLeft = e.clientX < rootCenterX;
                
                if (startLeft !== endLeft) {
                    const isLeftward = endLeft;
                    isChanged = moveNodeAcrossSide(targetRootData, movedNodeId, isLeftward);
                } else {
                    const targetG = document.elementFromPoint(e.clientX, e.clientY);
                    const tEl = targetG ? targetG.closest('.markmap-node') : null;
                    const tD3 = tEl ? d3.select(tEl).datum() : null;
                    const targetId = tD3 && tD3.data ? tD3.data._id : null;
                    let inNodeRect = false;
                    
                    if (tEl && targetId) { 
                        try {
                            const r = tEl.getBoundingClientRect();
                            inNodeRect = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
                        } catch(err) { inNodeRect = false; }
                    }

                    if (targetId && targetId !== movedNodeId && !isInsideSubtree(targetRootData, movedNodeId, targetId)) {
                        if (inNodeRect) {
                            isChanged = reparentNode(targetRootData, movedNodeId, targetId, endLeft);
                        } else {
                            isChanged = reorderSiblings(targetRootData, movedNodeId, e.clientY);
                        }
                    } else {
                        isChanged = reorderSiblings(targetRootData, movedNodeId, e.clientY);
                    }
                }
            }

            if (isChanged) {
                window.formatInputState = {}; window.manualFormatStates = {};
                applyStateChange(targetRootData, true, false);
                setTimeout(() => flashNodeRed(movedNodeId), 60);
            } else {
                commitState(rootData, false, false);
            }
        }
        setTimeout(() => { isDragging = false; }, 50);
        dragState.isDown = false;
        dragState.isDragging = false;
        dragState.nodeG = null;
        dragState.nodeId = null;
    }, true);

    function prepareData(node, parent = null, branchColorIndex = null) {
        if (!node._id) node._id = ++idCounter; else if (node._id > idCounter) idCounter = node._id;
        node._parent = parent;
        
        if (parent !== null) {
            node._branchColorIndex = branchColorIndex; 
        }
        
        const children = node.children || node._children;
        if (children) {
            let usedColors = new Set();
            if (parent === null) {
                children.forEach(c => {
                    if (c._branchColorIndex !== undefined && c._branchColorIndex !== null) {
                        usedColors.add(c._branchColorIndex);
                    }
                });
            }

            children.forEach((child, i) => {
                let nextColorIndex;
                if (parent === null) {
                    if (child._branchColorIndex !== undefined && child._branchColorIndex !== null) {
                        nextColorIndex = child._branchColorIndex;
                    } else {
                        let newIdx = i;
                        while (usedColors.has(newIdx)) {
                            newIdx++;
                        }
                        usedColors.add(newIdx);
                        child._branchColorIndex = newIdx;
                        nextColorIndex = newIdx;
                    }
                } else {
                    nextColorIndex = branchColorIndex;
                }
                prepareData(child, node, nextColorIndex);
            });
        }
    }
    
    function stripParent(node) {
        const n = { ...node }; 
        delete n._parent;
        if (n.children) n.children = n.children.map(stripParent);
        if (n._children) n._children = n._children.map(stripParent);
        return n;
    }
    
    function getIds(node, set = new Set()) {
        if (!node) return set; set.add(node._id);
        const children = node.children || node._children; if (children) children.forEach(c => getIds(c, set)); return set;
    }
    
    function updateLevel2Numbering(nodeTarget) {
        if (!nodeTarget) return;
        const cn = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五"];
        const stripNum = (txt) => (txt || '').replace(/^[一二三四五六七八九十百]+、/, '');
        const cleanNonLevel2 = (node, depth) => {
            if (depth !== 2 && node.content) node.content = stripNum(node.content);
            const c = node.children || node._children;
            if (c) c.forEach(ch => cleanNonLevel2(ch, depth + 1));
        };
        if (nodeTarget.children) {
            const rightKids = nodeTarget.children.filter(c => !c._isLeft);
            const leftKids = nodeTarget.children.filter(c => c._isLeft);
            let idx = 0;
            const assignNum = (child) => {
                const num = (cn[idx] || (idx + 1)) + "、";
                idx++;
                if (child.content) {
                    const stripped = stripNum(child.content);
                    child.content = (stripped ? num + stripped : child.content);
                }
            };
            rightKids.forEach(assignNum);
            leftKids.forEach(assignNum);
            nodeTarget.children.forEach(ch => cleanNonLevel2(ch, 2));
        } else if (nodeTarget._children) {
            nodeTarget._children.forEach(ch => cleanNonLevel2(ch, 2));
        }
    }
    
    function refreshButtons() {
        document.getElementById('undo-btn').disabled = currentHistoryIndex <= 0;
        document.getElementById('redo-btn').disabled = currentHistoryIndex >= historyStack.length - 1;
    }
    
    function saveActionState() {
        const stateStr = JSON.stringify(stripParent(rootData));
        if (currentHistoryIndex < historyStack.length - 1) historyStack = historyStack.slice(0, currentHistoryIndex + 1);
        if (historyStack.length === 0 || historyStack[currentHistoryIndex] !== stateStr) { historyStack.push(stateStr); currentHistoryIndex++; }
        localStorage.setItem(STORAGE_KEY, stateStr); 
        refreshButtons();
    }

    const AUTO_BR_HTML = '<br class="autobr">';
    const AUTO_BR_REGEX = /<br\s+class=["']?autobr["']?\s*\/?>/gi;
    const ALL_BR_REGEX = /<br[^>]*>/gi;

    const cleanAutoBr = (html) => html ? html.replace(AUTO_BR_REGEX, '') : "";

    const getCharLen = (str) => {
        let len = 0;
        for (let i = 0; i < str.length; i++) { len += str.charCodeAt(i) > 255 ? 2 : 1; }
        return len;
    };

    const textToLines = (html) => {
        if (!html) return [];
        let text = html.replace(ALL_BR_REGEX, '\n').replace(/<[^>]+>/g, '');
        return text.split('\n');
    };

    const getMaxVisualLineLen = (html) => {
        let lines = textToLines(html);
        return lines.length > 0 ? Math.max(...lines.map(l => getCharLen(l))) : 0;
    };

    const getMaxRawLen = (html) => {
        let cleaned = cleanAutoBr(html);
        let lines = textToLines(cleaned);
        return lines.length > 0 ? Math.max(...lines.map(l => getCharLen(l))) : 0;
    };

    const getBreaks = (str) => {
        const { punctuations, words, pairs } = window.MINDMAP_CONFIG.symbols;
        let breaks = [];
        let nestStack = [];

        const getPairInfo = (c) => {
            if (!pairs) return null;
            for (let p of pairs) {
                if (p.length === 2) {
                    if (c === p[0] && c === p[1]) return { type: 'same', char: c };
                    if (c === p[0]) return { type: 'open', close: p[1] };
                    if (c === p[1]) return { type: 'close', open: p[0] };
                }
            }
            return null;
        };

        for (let i = 0; i < str.length; i++) {
            let char = str[i];
            let next = i < str.length - 1 ? str[i+1] : '';

            let pInfo = getPairInfo(char);
            if (pInfo) {
                if (pInfo.type === 'same') {
                    if (nestStack.length > 0 && nestStack[nestStack.length-1] === char) nestStack.pop();
                    else nestStack.push(char);
                } else if (pInfo.type === 'open') {
                    nestStack.push(pInfo.close);
                } else if (pInfo.type === 'close') {
                    if (nestStack.length > 0 && nestStack[nestStack.length-1] === char) nestStack.pop();
                }
            }

            let isBreak = false;
            if ((punctuations + " \t").includes(char)) {
                isBreak = true;
            }
            
            if (!isBreak && words && words.length > 0) {
                let sub = str.substring(0, i + 1);
                for (let w of words) {
                    let lowerWord = w.toLowerCase();
                    if (sub.toLowerCase().endsWith(lowerWord)) {
                        let isAllLetters = /^[a-z]+$/.test(lowerWord);
                        if (isAllLetters) {
                            let len = w.length;
                            let before = (i >= len) ? str[i - len] : ' ';
                            if (!/[a-zA-Z]/.test(before) && !/[a-zA-Z]/.test(next)) {
                                isBreak = true;
                                break;
                            }
                        } else {
                            isBreak = true;
                            break;
                        }
                    }
                }
            }
            
            if (isBreak) {
                breaks.push({ index: i + 1, level: nestStack.length === 0 ? 1 : 2 });
            }
        }
        return breaks;
    };

    const findBestBreakPure = (chunk, nextChar) => {
        let tempStr = chunk + nextChar;
        let breaks = getBreaks(tempStr);
        
        let l1 = -1, l2 = -1;
        breaks.forEach(b => {
            if (b.index <= chunk.length) {
                if (b.level === 1) l1 = Math.max(l1, b.index);
                else l2 = Math.max(l2, b.index);
            }
        });
        
        if (l1 !== -1) return l1;
        if (l2 !== -1) return l2;
        return chunk.length;
    };

    const getAllValidBreaks = (html) => {
        let cleaned = cleanAutoBr(html);
        let lines = textToLines(cleaned);
        let allBreaks = new Set();
        
        lines.forEach(line => {
            let breaks = getBreaks(line);
            let breakIdxSet = new Set(breaks.map(b => b.index));
            let visualLen = 0;
            
            for (let i = 0; i < line.length; i++) {
                visualLen += line.charCodeAt(i) > 255 ? 2 : 1;
                if (i === line.length - 1 || breakIdxSet.has(i + 1)) {
                    allBreaks.add(visualLen);
                }
            }
        });
        return [...allBreaks].sort((a,b)=>a-b);
    };

    const wrapTextHTMLSafe = (htmlStr, limit) => {
        if (!htmlStr) return "";
        let cleaned = cleanAutoBr(htmlStr);
        if (limit === null) return cleaned; 

        let fragments = cleaned.split(ALL_BR_REGEX);
        
        const splitRawAtPureIndex = (rawStr, pureIndex) => {
            let pureCount = 0;
            let i = 0;
            for (; i < rawStr.length; i++) {
                if (pureCount === pureIndex) break;
                if (rawStr[i] === '<') {
                    while (i < rawStr.length && rawStr[i] !== '>') i++;
                } else {
                    pureCount++;
                }
            }
            return {
                before: rawStr.substring(0, i),
                after: rawStr.substring(i)
            };
        };
        
        const wrapFragment = (rawHtml) => {
            let result = "";
            let currentVisualLength = 0;
            
            let chunkRaw = "";
            let chunkPure = "";
            
            for (let i = 0; i < rawHtml.length; i++) {
                if (rawHtml[i] === '<') {
                    let tag = "";
                    while (i < rawHtml.length && rawHtml[i] !== '>') {
                        tag += rawHtml[i]; i++;
                    }
                    tag += '>';
                    chunkRaw += tag;
                    continue;
                }

                let char = rawHtml[i];
                let charLen = char.charCodeAt(0) > 255 ? 2 : 1;

                if (currentVisualLength + charLen > limit && currentVisualLength > 0) {
                    let breakIdxPure = findBestBreakPure(chunkPure, char);
                    
                    if (breakIdxPure > 0 && breakIdxPure < chunkPure.length) {
                        let splitRaw = splitRawAtPureIndex(chunkRaw, breakIdxPure);
                        result += splitRaw.before + AUTO_BR_HTML;
                        chunkRaw = splitRaw.after + char;
                        chunkPure = chunkPure.substring(breakIdxPure) + char;
                        currentVisualLength = getCharLen(chunkPure);
                    } else {
                        result += chunkRaw + AUTO_BR_HTML;
                        chunkRaw = char;
                        chunkPure = char;
                        currentVisualLength = charLen;
                    }
                } else {
                    chunkRaw += char;
                    chunkPure += char;
                    currentVisualLength += charLen;
                }
            }
            result += chunkRaw;
            return result;
        };

        return fragments.map(frag => wrapFragment(frag)).join('<br>');
    };

    const calculateNextLimit = (nodes, action) => {
        let current_max = 0;
        let absoluteMaxRaw = 0;

        nodes.forEach(node => {
            let maxRaw = getMaxRawLen(node.content);
            if (maxRaw > absoluteMaxRaw) absoluteMaxRaw = maxRaw;

            let l = getMaxVisualLineLen(node.content);
            if (l > current_max) current_max = l;
        });

        if (action === 'narrow') {
            let candidates = [];
            nodes.forEach(node => {
                let l = getMaxVisualLineLen(node.content);
                if (l >= current_max - 2) {
                    let breaks = getAllValidBreaks(node.content);
                    let validBreaks = breaks.filter(b => b < l);
                    if (validBreaks.length > 0) candidates.push(Math.max(...validBreaks));
                }
            });
            return candidates.length > 0 ? Math.max(...candidates) : Math.max(2, current_max - 2);

        } else if (action === 'widen') {
            let candidates = [];
            nodes.forEach(node => {
                let l = getMaxVisualLineLen(node.content);
                let rawLen = getMaxRawLen(node.content); 
                if (l >= current_max - 2 && rawLen > l) {
                    let breaks = getAllValidBreaks(node.content);
                    let validBreaks = breaks.filter(b => b > l);
                    if (validBreaks.length > 0) candidates.push(Math.min(...validBreaks));
                }
            });
            
            if (candidates.length > 0) {
                let minWiden = Math.min(...candidates);
                return minWiden >= absoluteMaxRaw ? null : minWiden;
            }
            return null;
        }
        return null;
    };

    function adjustBranchFormat(branchId, depth, action) {
        if (isAnimating) return;

        const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
        let targetBranch = null;
        let startDepth = 2;
        if (targetRootData._id === branchId) {
            targetBranch = targetRootData;
            startDepth = 1;
        } else if (targetRootData.children) {
            targetBranch = targetRootData.children.find(c => c._id === branchId);
        }
        if (!targetBranch) return;

        const targetNodes = [];
        const traverse = (node, currentDepth) => {
            if (currentDepth === depth) targetNodes.push(node);
            else if (currentDepth < depth) {
                let children = node.children || node._children;
                if (children) children.forEach(c => traverse(c, currentDepth + 1));
            }
        };
        traverse(targetBranch, startDepth);
        if (targetNodes.length === 0) return;

        if (!window.formatInputState[branchId]) window.formatInputState[branchId] = {};
        window.formatInputState[branchId][depth] = calculateNextLimit(targetNodes, action);
        
        if (!window.manualFormatStates) window.manualFormatStates = {};
        if (!window.manualFormatStates[branchId]) window.manualFormatStates[branchId] = {};
        window.manualFormatStates[branchId][depth] = true;

        executeFormatBranch(branchId);
    }
    
    function getWidestBranchId() {
        let widestId = null;
        let maxRightEdge = -Infinity;
        
        try {
            const svgEl = document.getElementById('mindmap-svg');
            const nodes = svgEl.querySelectorAll('.markmap-node');
            const leftNodes = document.getElementById('mindmap-svg-left').querySelectorAll('.markmap-node');
            
            const collect = (nodeList) => {
                nodeList.forEach(node => {
                    const d3Node = d3.select(node).datum();
                    if (d3Node && d3Node.depth > 0) {
                        let branch = d3Node;
                        while (branch.depth > 1 && branch.parent) {
                            branch = branch.parent;
                        }
                        const branchId = branch.data._id;
                        
                        let textWidth = 0;
                        try {
                            textWidth = node.getBBox().width;
                        } catch(e) {}
                        
                        const rightEdge = (d3Node.y || 0) + (textWidth || 0);
                        
                        if (rightEdge > maxRightEdge) {
                            maxRightEdge = rightEdge;
                            widestId = branchId;
                        }
                    }
                });
            };
            collect(nodes); collect(leftNodes);
        } catch(e) {}
        
        if (widestId === null && rootData && rootData.children) {
            let maxScore = -1;
            rootData.children.forEach(branch => {
                let branchMaxScore = 0;
                const traverse = (node, depth) => {
                    const visualLen = getMaxVisualLineLen(node.content);
                    const score = depth * 40 + visualLen * 14; 
                    if (score > branchMaxScore) branchMaxScore = score;
                    const children = node.children || node._children;
                    if (children) children.forEach(c => traverse(c, depth + 1));
                };
                traverse(branch, 1);
                if (branchMaxScore > maxScore) {
                    maxScore = branchMaxScore;
                    widestId = branch._id;
                }
            });
        }
        
        if (widestId === null && rootData && rootData.children && rootData.children.length > 0) {
            widestId = rootData.children[0]._id;
        }
        
        return widestId;
    }

    function updateDynamicFormatUI() {
        const container = document.getElementById('dynamic-format-container');
        if (!container) return;
        container.innerHTML = ''; 
        
        if (!rootData) return;
        
        const cnNum = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五"];
        const { ui } = window.MINDMAP_CONFIG;

        let currentRatio = 1;
        try {
            const svgEl = document.getElementById('mindmap-svg');
            const gEl = svgEl.querySelector('g');
            const gLeftEl = document.getElementById('mindmap-svg-left').querySelector('g');
            let bbox = null;
            if (gEl) bbox = gEl.getBBox();
            
            const hasLeftNodes = !!document.querySelector('#mindmap-svg-left .markmap-node[data-depth="2"]');
            if (hasLeftNodes && gLeftEl) {
                const lb = gLeftEl.getBBox();
                if (lb.width > 0 || lb.height > 0) {
                    const ls = getLeftShiftUnits();
                    const lMinX = -lb.x - lb.width + ls, lMaxX = -lb.x + ls;
                    if (!bbox) bbox = { x: lMinX, y: lb.y, width: lMaxX - lMinX, height: lb.height };
                    else {
                        const rMinX = bbox.x, rMaxX = bbox.x + bbox.width;
                        const minX = Math.min(rMinX, lMinX), maxX = Math.max(rMaxX, lMaxX);
                        const minY = Math.min(bbox.y, lb.y), maxY = Math.max(bbox.y + bbox.height, lb.y + lb.height);
                        bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
                    }
                }
            }
            if (bbox && bbox.height > 0) {
                currentRatio = bbox.width / bbox.height;
            }
        } catch(e) {}

        const isLandscape = currentRatio >= 1;
        const targetRatio = isLandscape ? 1.414 : 0.707;
        
        if (!window.isManualPrintOrientation) {
            const btnP = document.getElementById('btn-portrait');
            const btnL = document.getElementById('btn-landscape');
            if (btnP && btnL) {
                if (isLandscape) {
                    btnL.classList.add('active');
                    btnP.classList.remove('active');
                } else {
                    btnP.classList.add('active');
                    btnL.classList.remove('active');
                }
            }
        }
        
        const minRatio = targetRatio - 0.5;
        const maxRatio = targetRatio + 0.5;
        let percent = ((currentRatio - minRatio) / (maxRatio - minRatio)) * 100;
        
        percent = Math.max(4, Math.min(96, percent));

        const sliderPanel = document.createElement('div');
        sliderPanel.className = 'print-panel';
        sliderPanel.style.marginTop = '0px';
        sliderPanel.style.marginBottom = '2px';
        sliderPanel.style.padding = '8px 10px 16px 10px';
        sliderPanel.style.backgroundColor = '#fff'; 
        
        sliderPanel.innerHTML = `
            <div style="position: relative; height: 35px; width: 100%; margin-top: 5px;">
                <div style="position: absolute; top: 16px; left: 0; width: 100%; height: 2px; background: #333;"></div>
                <div style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                    <div style="width: 2px; height: 8px; background: #333;"></div>
                    <span style="font-size: 10px; color: #333; margin-top: 2px; font-weight: bold;">${targetRatio.toFixed(3)}</span>
                </div>
                <div style="position: absolute; bottom: 19px; left: ${percent}%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; transition: left 0.3s ease-out;">
                    <span style="font-size: 10px; color: #0d6efd; margin-bottom: 2px; font-weight: bold; white-space: nowrap;">${currentRatio.toFixed(3)}</span>
                    <div style="width: 2px; height: 8px; background: #0d6efd;"></div>
                </div>
            </div>
        `;
        container.appendChild(sliderPanel);

        const rootId = rootData._id;
        if (!window.formatInputState[rootId]) window.formatInputState[rootId] = {};
        if (!window.formatInputState[rootId].hasOwnProperty(1)) { window.formatInputState[rootId][1] = null; }

        const rootPanel = document.createElement('div');
        rootPanel.className = 'print-panel';
        rootPanel.style.marginTop = '0px';
        rootPanel.style.backgroundColor = '#f8f9fa'; 
        rootPanel.innerHTML = `
            <div class="print-row" style="margin-top: 2px;">
                <div class="scale-wrapper" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 2px 6px; border: 1px solid #ccc; border-radius: 4px; background: #fff;">
                    <span class="branch-reset-btn" data-id="${rootId}" style="font-size: 12px; font-weight: bold; color: #333; padding: 2px 4px; border-radius: 3px;">根点</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="adjust-btn narrow-btn" data-id="${rootId}" data-depth="1">《</button>
                        <button class="adjust-btn widen-btn" data-id="${rootId}" data-depth="1">》</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(rootPanel);

        const leftKids = (rootData.children || []).filter(c => c._isLeft);
        if (leftKids.length > 0) {
            const leftNodesAll = [];
            const collectLeft = (node) => {
                leftNodesAll.push(node);
                const ch = node.children || node._children;
                if (ch) ch.forEach(collectLeft);
            };
            leftKids.forEach(collectLeft);

            if (window.leftLengthLimit === undefined || window.leftLengthLimit === null) {
                let curMax = 0;
                leftNodesAll.forEach(n => { const l = getMaxVisualLineLen(n.content); if (l > curMax) curMax = l; });
                window.leftLengthLimit = curMax;
            }

            const leftPanel = document.createElement('div');
            leftPanel.className = 'print-panel';
            leftPanel.style.marginTop = '0px';
            leftPanel.style.backgroundColor = '#f8f9fa';
            leftPanel.innerHTML = `
                <div class="print-row" style="margin-top: 2px;">
                    <div class="scale-wrapper" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 2px 6px; border: 1px solid #ccc; border-radius: 4px; background: #fff;">
                        <span style="font-size: 12px; font-weight: bold; color: #000; padding: 2px 4px; border-radius: 3px;">左侧</span>
                        <div style="display: flex; align-items: center; position: relative;">
                            <span id="left-len-value" style="font-size: 9px; font-weight: bold; color: #000; position: absolute; right: 100%; margin-right: 4px;">${window.leftLengthLimit}</span>
                            <div style="display: flex; gap: 8px;">
                                <button class="left-len-btn left-narrow-btn narrow-btn">《</button>
                                <button class="left-len-btn left-widen-btn widen-btn">》</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.insertBefore(leftPanel, rootPanel);

            const applyLeftLimit = () => {
                const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
                const lk = (targetRootData.children || []).filter(c => c._isLeft);
                const collect = (node) => {
                    if (node.content) node.content = wrapTextHTMLSafe(node.content, window.leftLengthLimit);
                    const ch = node.children || node._children;
                    if (ch) ch.forEach(collect);
                };
                lk.forEach(collect);
                window.formatInputState = {}; window.manualFormatStates = {};
                applyStateChange(targetRootData, true, true);
            };

            leftPanel.querySelector('.left-narrow-btn').addEventListener('click', () => {
                const next = calculateNextLimit(leftNodesAll, 'narrow');
                window.leftLengthLimit = (next !== null && next !== undefined) ? Math.max(1, next) : Math.max(1, window.leftLengthLimit - 1);
                applyLeftLimit();
            });
            leftPanel.querySelector('.left-widen-btn').addEventListener('click', () => {
                const next = calculateNextLimit(leftNodesAll, 'widen');
                if (next !== null && next !== undefined) {
                    window.leftLengthLimit = next;
                } else {
                    window.leftLengthLimit = window.leftLengthLimit + 1;
                }
                applyLeftLimit();
            });
        }

        const widestBranchId = getWidestBranchId();

        if (rootData.children) {
            rootData.children.forEach((child, i) => {
                const id = child._id;
                
                if (id !== widestBranchId) return;

                let depthStats = {}; 
                const traverseDepth = (node, currentDepth) => {
                    let len = getMaxVisualLineLen(node.content);
                    if (!depthStats[currentDepth] || len > depthStats[currentDepth]) {
                        depthStats[currentDepth] = len;
                    }
                    const children = node.children || node._children;
                    if (children && children.length > 0) {
                        children.forEach(c => traverseDepth(c, currentDepth + 1));
                    }
                };
                
                traverseDepth(child, 2); 
                
                if (!window.formatInputState[id]) window.formatInputState[id] = {};
                for (let d in depthStats) {
                    if (!window.formatInputState[id].hasOwnProperty(d)) { window.formatInputState[id][d] = null; }
                }
                for (let d in window.formatInputState[id]) {
                    if (!depthStats.hasOwnProperty(d)) { delete window.formatInputState[id][d]; }
                }
                
                const state = window.formatInputState[id];
                let prefix = cnNum[i + 1] || (i + 1);
                
                let btnBg = ui.formatBtnBg;
                let btnColor = ui.formatBtnText;
                try {
                    const nodeG = d3.selectAll('.markmap-node').filter(d => d && d.data && d.data._id === id).node();
                    if (nodeG) {
                        const circle = nodeG.querySelector('circle');
                        if (circle) {
                            const stroke = circle.getAttribute('stroke') || window.getComputedStyle(circle).stroke;
                            if (stroke && stroke !== 'none') {
                                btnBg = stroke;
                                btnColor = '#ffffff'; 
                            }
                        }
                    }
                } catch(e) {}
                
                const panel = document.createElement('div');
                panel.className = 'print-panel';
                panel.style.marginTop = '0px';
                
                let inputsHtml = '';
                const depths = Object.keys(state).map(Number).sort((a,b)=>a-b);
                depths.forEach(depth => {
                    let levelName = cnNum[depth] ? cnNum[depth] + "级" : depth + "级";
                    inputsHtml += `
                        <div class="print-row" style="margin-top: 2px;">
                            <div class="scale-wrapper" style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 2px 6px; border: 1px solid #ccc; border-radius: 4px; background: #fff;">
                                <span style="font-size: 11px; font-weight: bold; color: #555;">${levelName}</span>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <button class="adjust-btn narrow-btn" style="color: ${btnBg};" data-id="${id}" data-depth="${depth}">《</button>
                                    <button class="adjust-btn widen-btn" style="color: ${btnBg};" data-id="${id}" data-depth="${depth}">》</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                panel.innerHTML = `
                    <div class="branch-reset-btn" data-id="${id}" style="font-size: 12px; font-weight: bold; color: ${btnColor}; background: ${btnBg}; padding: 3px 6px; border-radius: 4px; text-align: center; margin-bottom: 2px;">
                        ${prefix} 分支 (最宽)
                    </div>
                    ${inputsHtml}
                `;
                container.appendChild(panel);
            });
        }

        container.querySelectorAll('.branch-reset-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.getAttribute('data-id'));
                if (window.formatInputState[id]) {
                    for (let d in window.formatInputState[id]) {
                        window.formatInputState[id][d] = null;
                    }
                }
                if (window.manualFormatStates && window.manualFormatStates[id]) {
                    delete window.manualFormatStates[id];
                }
                executeFormatBranch(id);
            });
        });

        container.querySelectorAll('.adjust-btn[data-id]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.getAttribute('data-id'));
                const depth = parseInt(this.getAttribute('data-depth'));
                const action = this.classList.contains('narrow-btn') ? 'narrow' : 'widen';
                adjustBranchFormat(id, depth, action);
            });
        });
    }

    // =========================================================================
    // 底层安全补丁：完全不动文字的原生坐标系和任何 D3 的挂载逻辑，保证排版计算引擎不锁死！
    // 任务：将尾端线段 x2 向内回缩 14px，并将圈圈和对应的子分支起点同步缩放 14px，让它们严丝合缝
    // =========================================================================
    function runSafeAlignmentEngine() {
        const SHRINK_LINE = 14; 
        
        document.querySelectorAll('.markmap-node:not([data-depth="1"])').forEach(node => {
            let line = node.querySelector('line');
            if (line) {
                let currentX2 = line.getAttribute('x2');
                if (currentX2 && currentX2 !== line.getAttribute('data-patched-x2')) {
                    let ox2 = parseFloat(currentX2);
                    if (!isNaN(ox2)) {
                        let nx2 = Math.max(0, ox2 - SHRINK_LINE).toString();
                        line.setAttribute('x2', nx2);
                        line.setAttribute('data-patched-x2', nx2);
                    }
                }
            }

            let circle = node.querySelector('circle');
            if (circle) {
                let currentCx = circle.getAttribute('cx');
                if (currentCx && currentCx !== circle.getAttribute('data-patched-cx')) {
                    let ocx = parseFloat(currentCx);
                    if (!isNaN(ocx)) {
                        let ncx = (ocx - SHRINK_LINE).toString();
                        circle.setAttribute('cx', ncx);
                        circle.setAttribute('data-patched-cx', ncx);
                    }
                }
            }
        });

        document.querySelectorAll('.markmap-link').forEach(path => {
            let currentD = path.getAttribute('d');
            if (currentD && currentD !== path.getAttribute('data-patched-d')) {
                let d3data = d3.select(path).datum();
                if (d3data && d3data.source && d3data.source.depth >= 1) {
                    const parts = currentD.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
                    if (parts && parts.length === 8) {
                        let nums = parts.map(Number);
                        if (!nums.some(isNaN)) {
                            // 连线发源地跟随节点线尾向内缩 14px，绝对吻合！
                            nums[0] -= SHRINK_LINE;
                            nums[2] -= SHRINK_LINE;
                            
                            let newD = `M${nums[0]},${nums[1]}C${nums[2]},${nums[3]} ${nums[4]},${nums[5]} ${nums[6]},${nums[7]}`;
                            path.setAttribute('d', newD);
                            path.setAttribute('data-patched-d', newD);
                        } else {
                            path.setAttribute('data-patched-d', currentD);
                        }
                    } else {
                        path.setAttribute('data-patched-d', currentD);
                    }
                } else {
                    path.setAttribute('data-patched-d', currentD);
                }
            }
        });
    }

    // 采用绝对安全的定时器做单向修补，绝不触发 D3 死循环重绘！
    setInterval(() => {
        try { runSafeAlignmentEngine(); } catch(e) {}
    }, 50);

    function triggerEditNode(nodeG) {
        const d3Node = d3.select(nodeG).datum(); 
        if (!d3Node || !d3Node.data || typeof d3Node.data.content === 'undefined') return;
        
        const existing = document.getElementById('edit-container'); 
        if (existing) existing.remove();
        
        let rawContent = (d3Node.data.content || '').replace(AUTO_BR_REGEX, '<br>');
        
        const textEl = nodeG.querySelector('text') || nodeG;
        const rect = textEl.getBoundingClientRect();
        
        const transform = d3.zoomTransform(containerEl);
        const currentScale = transform.k;
        const baseFontSize = parseFloat(window.getComputedStyle(textEl).fontSize) || 14;
        const scaledFontSize = baseFontSize * currentScale;
        
        const paddingTop = 2, paddingLeft = 4, borderW = 2;
        const vOffset = 2 * currentScale; 
        
        const offsetX = (window.MINDMAP_CONFIG.ui.editBoxOffsetX || 0) * currentScale;
        const offsetY = (window.MINDMAP_CONFIG.ui.editBoxOffsetY || 0) * currentScale;
        
        const exactTop = rect.top - paddingTop - borderW - vOffset + offsetY;
        const exactLeft = rect.left - paddingLeft - borderW + offsetX;
        
        const container = document.createElement('div');
        container.id = 'edit-container';
        Object.assign(container.style, {
            position: 'fixed', top: exactTop + 'px', left: exactLeft + 'px',
            zIndex: '10000', display: 'flex', alignItems: 'flex-start',
            gap: '6px', flexDirection: 'row' 
        });
        
        const input = document.createElement('div'); 
        input.id = 'edit-input'; 
        input.contentEditable = "true";
        input.innerHTML = rawContent; 
        
        Object.assign(input.style, { 
            position: 'relative', minWidth: Math.max(150, rect.width + 30) + 'px', 
            minHeight: 'auto', fontSize: scaledFontSize + 'px', 
            padding: `${paddingTop}px ${paddingLeft}px`, margin: '0', 
            backgroundColor: '#fff', border: `${borderW}px solid #007bff`, 
            borderRadius: '4px', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', 
            fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: '1.2'
        });
        
        const toolBar = document.createElement('div');
        Object.assign(toolBar.style, { display: 'flex', gap: '4px', flexDirection: 'row' });
        
        const hlBtn = document.createElement('button');
        hlBtn.innerText = '强调'; hlBtn.className = 'rich-btn hl-btn';
        hlBtn.style.marginRight = '0px';
        
        const italicBtn = document.createElement('button');
        italicBtn.innerText = '斜体'; italicBtn.className = 'rich-btn italic-btn';
        italicBtn.style.marginRight = '4px'; 

        const addBtn = document.createElement('button');
        addBtn.innerText = '添加子节点';
        addBtn.className = 'rich-btn add-btn';

        const delBtn = document.createElement('button');
        delBtn.innerText = '删除本节点';
        delBtn.className = 'rich-btn del-btn';

        const delLeftBtn = document.createElement('button');
        delLeftBtn.innerText = '删除左侧所有节点';
        delLeftBtn.className = 'rich-btn del-btn';
        delLeftBtn.style.marginLeft = '16px'; 

        delLeftBtn.onmousedown = (e) => {
            e.preventDefault();
            const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
            if (targetRootData.children) {
                targetRootData.children = targetRootData.children.filter(c => !c._isLeft);
                if (targetRootData.children.length === 0) delete targetRootData.children;
            }
            window.formatInputState = {}; window.manualFormatStates = {};
            container.remove();
            applyStateChange(targetRootData, true, true);
        };

        const updateBtnStates = () => {
            let sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            
            let htmlToTest = "";
            let textLen = sel.toString().trim().length;
            
            if (textLen === 0 || textLen === input.innerText.trim().length) {
                htmlToTest = input.innerHTML;
            } else {
                let frag = sel.getRangeAt(0).cloneContents();
                let div = document.createElement('div');
                div.appendChild(frag);
                htmlToTest = div.innerHTML;
            }
            
            let colorValue = document.queryCommandValue('foreColor') || '';
            let isNativeRed = colorValue.includes('220, 53, 69') || colorValue.includes('#dc3545');
            let hasRedTag = htmlToTest.includes('rgb(220, 53, 69)') || htmlToTest.includes('#dc3545') || htmlToTest.includes('220, 53, 69');
            
            let isNativeBold = document.queryCommandState('bold');
            let hasBoldTag = htmlToTest.includes('font-weight') || htmlToTest.includes('bold') || htmlToTest.includes('<b>') || htmlToTest.includes('<strong>');
            
            let isNativeItalic = document.queryCommandState('italic');
            let hasItalicTag = htmlToTest.includes('font-style') || htmlToTest.includes('italic') || htmlToTest.includes('<i>') || htmlToTest.includes('<em>');
            
            let emActive = isNativeBold || isNativeRed || hasRedTag || hasBoldTag;
            let itActive = isNativeItalic || hasItalicTag;
            
            if (emActive) hlBtn.classList.add('active'); else hlBtn.classList.remove('active');
            if (itActive) italicBtn.classList.add('active'); else italicBtn.classList.remove('active');
        };

        hlBtn.onmousedown = (e) => { 
            e.preventDefault(); 
            let sel = window.getSelection();
            if(sel.toString().trim() === "") { document.execCommand('selectAll', false, null); }
            document.execCommand('styleWithCSS', false, true); 
            
            if (hlBtn.classList.contains('active')) {
                if (document.queryCommandState('bold')) document.execCommand('bold', false, null);
                else { document.execCommand('bold', false, null); if (document.queryCommandState('bold')) document.execCommand('bold', false, null); }
                document.execCommand('foreColor', false, '#333333'); 
                hlBtn.classList.remove('active');
            } else {
                if (!document.queryCommandState('bold')) document.execCommand('bold', false, null);
                document.execCommand('foreColor', false, '#dc3545');
                hlBtn.classList.add('active');
            }
            setTimeout(updateBtnStates, 10);
        };

        italicBtn.onmousedown = (e) => { 
            e.preventDefault(); 
            let sel = window.getSelection();
            if(sel.toString().trim() === "") { document.execCommand('selectAll', false, null); }
            
            if (italicBtn.classList.contains('active')) {
                if (document.queryCommandState('italic')) document.execCommand('italic', false, null);
                else { document.execCommand('italic', false, null); if (document.queryCommandState('italic')) document.execCommand('italic', false, null); }
                italicBtn.classList.remove('active');
            } else {
                if (!document.queryCommandState('italic')) document.execCommand('italic', false, null);
                italicBtn.classList.add('active');
            }
            setTimeout(updateBtnStates, 10);
        };

        addBtn.onmousedown = (e) => {
            e.preventDefault();
            let newVal = input.innerHTML.replace(/<div><br><\/div>/gi, '<br>').replace(/<div>/gi, '<br>').replace(/<\/div>/gi, '').trim();
            if (newVal === '' || newVal === '<br>') return; 
            
            const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
            let parentNode = null;
            (function updateAndFind(n) { 
                if(n._id === d3Node.data._id) { n.content = newVal; parentNode = n; return true; } 
                const c = n.children || n._children; 
                if(c) { for (let x of c) if(updateAndFind(x)) return true; } 
                return false; 
            })(targetRootData);
            
            if (parentNode) {
                if (parentNode._children && !parentNode.children) {
                    parentNode.children = parentNode._children;
                    delete parentNode._children;
                }
                if (!parentNode.children) parentNode.children = [];
                const newId = ++idCounter;
                const isLeftChild = parentNode._id === rootData._id ? false : !!parentNode._isLeft;
                parentNode.children.push({ _id: newId, content: "", _isLeft: isLeftChild });
                
                window.formatInputState = {}; window.manualFormatStates = {};
                container.remove();
                
                applyStateChange(targetRootData, true, false, () => {
                    const svgs = [document.getElementById('mindmap-svg'), document.getElementById('mindmap-svg-left')];
                    let newNodeDOM = null;
                    svgs.forEach(svg => {
                        if (newNodeDOM || !svg) return;
                        const el = Array.from(svg.querySelectorAll('.markmap-node')).find(g => {
                            const d = d3.select(g).datum();
                            return d && d.data && d.data._id === newId;
                        });
                        if (el) newNodeDOM = el;
                    });
                    if (newNodeDOM) {
                        triggerEditNode(newNodeDOM);
                    }
                });
            }
        };

        delBtn.onmousedown = (e) => {
            e.preventDefault();
            if (d3Node.data._id === rootData._id) return;
            const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
            (function remove(n, id) { 
                const c = n.children || n._children; 
                if(!c) return false; 
                const i = c.findIndex(x => x._id === id); 
                if (i > -1) { 
                    c.splice(i, 1); 
                    if(c.length===0){delete n.children; delete n._children;} 
                    return true; 
                } 
                for (let x of c) if(remove(x, id)) return true; 
                return false; 
            })(targetRootData, d3Node.data._id);
            
            window.formatInputState = {}; window.manualFormatStates = {};
            container.remove();
            applyStateChange(targetRootData, true, false);
        };
        
        toolBar.appendChild(hlBtn); 
        toolBar.appendChild(italicBtn);
        toolBar.appendChild(addBtn);
        toolBar.appendChild(delBtn);
        if (d3Node.data._id === rootData._id) {
            toolBar.appendChild(delLeftBtn);
        }
        container.appendChild(input); container.appendChild(toolBar); document.body.appendChild(container); 
        
        const autoResize = () => { input.style.width = 'auto'; };
        input.addEventListener('input', autoResize);
        input.addEventListener('mouseup', updateBtnStates); input.addEventListener('keyup', updateBtnStates);
        
        input.focus(); document.execCommand('selectAll', false, null); autoResize(); setTimeout(updateBtnStates, 10); 

        function save() {
            if (!document.body.contains(container)) return; 
            
            let newVal = input.innerHTML;
            newVal = newVal.replace(/<div><br><\/div>/gi, '<br>');
            newVal = newVal.replace(/<div>/gi, '<br>').replace(/<\/div>/gi, '').trim();

            if (newVal === '' || newVal === '<br>') {
                if (d3Node.data._id === rootData._id) {
                } else {
                    const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
                    (function removeAndPromote(n, id) {
                        const c = n.children || n._children;
                        if (!c) return false;
                        const i = c.findIndex(x => x._id === id);
                        if (i > -1) {
                            const targetNode = c[i];
                            const targetChildren = targetNode.children || targetNode._children || [];
                            c.splice(i, 1, ...targetChildren);
                            if (c.length === 0) { delete n.children; delete n._children; }
                            return true;
                        }
                        for (let x of c) { if (removeAndPromote(x, id)) return true; }
                        return false;
                    })(targetRootData, d3Node.data._id);
                    
                    window.formatInputState = {}; window.manualFormatStates = {};
                    applyStateChange(targetRootData, true, false);
                }
            }
            else {
                const normalizedOld = (d3Node.data.content || '').replace(AUTO_BR_REGEX, '<br>');
                if (newVal !== normalizedOld) {
                    const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
                    (function update(n, id, txt) { 
                        if(n._id === id) { n.content = txt; return true; } 
                        const c = n.children || n._children; 
                        if(c) { for (let x of c) if(update(x, id, txt)) return true; } 
                        return false; 
                    })(targetRootData, d3Node.data._id, newVal);
                    
                    applyStateChange(targetRootData, true, false);
                }
            }
            container.remove();
        }
        
        input.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') {
                if (e.altKey || e.shiftKey) {
                    e.preventDefault();
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;
                    const range = selection.getRangeAt(0);
                    const br = document.createElement('br');
                    range.deleteContents(); range.insertNode(br); range.setStartAfter(br); range.setEndAfter(br);
                    selection.removeAllRanges(); selection.addRange(range); autoResize();
                } else {
                    e.preventDefault(); save();
                }
            } else if (e.key === 'Escape') {
                const normalizedOld = (d3Node.data.content || '').replace(AUTO_BR_REGEX, '<br>');
                if (normalizedOld === '' || normalizedOld === '<br>') {
                    save(); 
                } else {
                    container.remove(); 
                }
            } 
        }); 
        
        input.addEventListener('blur', () => { requestAnimationFrame(() => { if (document.activeElement !== input) save(); }); });
    }
    
    const bindSvgEvent = (type, fn, opts) => { svgEl.addEventListener(type, fn, opts); svgLeftEl.addEventListener(type, fn, opts); };

    bindSvgEvent('click', (e) => {
        if (isAnimating) return; 
        const nodeG = e.target.closest('.markmap-node'); 
        if (!nodeG) { window.getSelection().removeAllRanges(); return; } 
        if (isDragging || window.getSelection().toString().length > 0) { isDragging = false; return; } 
        
        if (e.target.tagName.toLowerCase() === 'circle') {
            setTimeout(() => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stripParent(rootData)));
                customFit();
                updateDynamicFormatUI();
            }, 300);
            return;
        }

        if (e.ctrlKey || e.metaKey) { 
            e.preventDefault(); e.stopPropagation(); 
            const d3Node = d3.select(nodeG).datum(); 
            if (!d3Node || !d3Node.data || typeof d3Node.data.content === 'undefined') return;
            if (d3Node.data._id === rootData._id) {
                return;
            }
            const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
            (function remove(n, id) { const c = n.children || n._children; if(!c) return false; const i = c.findIndex(x => x._id === id); if (i > -1) { c.splice(i, 1); if(c.length===0){delete n.children; delete n._children;} return true; } for (let x of c) if(remove(x, id)) return true; return false; })(targetRootData, d3Node.data._id);
            window.formatInputState = {}; window.manualFormatStates = {};
            applyStateChange(targetRootData, true, false);
        }
    }, true);

    bindSvgEvent('dblclick', (e) => {
        if (isAnimating) return; 
        const nodeG = e.target.closest('.markmap-node'); 
        if (!nodeG) { e.preventDefault(); e.stopPropagation(); window.getSelection().removeAllRanges(); customFit(); return; } 
        if (e.target.tagName.toLowerCase() === 'circle') return;
        
        e.preventDefault(); e.stopPropagation(); 
        triggerEditNode(nodeG);
    }, true);
    
    document.getElementById('restore-btn').addEventListener('click', () => { 
        if (isAnimating) return; 
        window.formatInputState = {}; window.manualFormatStates = {};
        window.isManualPrintOrientation = false; 
        applyStateChange(JSON.parse(JSON.stringify(originalRootData)), true, true); 
    });

    function executeFormatBranch(targetBranchId) {
        if (isAnimating) return;
        
        const limits = window.formatInputState[targetBranchId];
        if (!limits) return;

        const targetRootData = JSON.parse(JSON.stringify(stripParent(rootData)));
        
        let targetBranch = null;
        let startDepth = 2;
        
        if (targetRootData._id === targetBranchId) {
            targetBranch = targetRootData;
            startDepth = 1;
        } else if (targetRootData.children) {
            targetBranch = targetRootData.children.find(c => c._id === targetBranchId);
        }
        if (!targetBranch) return; 
        
        const applyFormatting = (node, depth) => {
            if (limits.hasOwnProperty(depth) && node.content) {
                let limit = limits[depth];
                node.content = wrapTextHTMLSafe(node.content, limit);
            }
            if (depth !== 1) {
                let children = node.children || node._children;
                if (children) {
                    children.forEach(child => applyFormatting(child, depth + 1));
                }
            }
        };

        applyFormatting(targetBranch, startDepth);
        applyStateChange(targetRootData, true, true);
    }

    function commitState(targetRootData, isNewAction, shouldFit = true, cb = null) { 
        rootData = targetRootData; 
        if (isNewAction) saveActionState(); 
        const rData = JSON.parse(JSON.stringify(stripParent(rootData)));
        const lData = JSON.parse(JSON.stringify(stripParent(rootData)));
        const rKids = (rData.children || []).filter(c => !c._isLeft);
        const lKids = (lData.children || []).filter(c => c._isLeft);
        if (rKids.length) rData.children = rKids; else delete rData.children;
        if (lKids.length) lData.children = lKids; else delete lData.children;
        
        Promise.all([mm.setData(rData), mmLeft.setData(lData)]).then(() => {
            setTimeout(() => {
                if (shouldFit) customFit();
                updateDynamicFormatUI();
                if (cb) cb();
            }, 60);
        });
    }
    
    function applyStateChange(targetRootData, isNewAction = true, shouldFit = true, cb = null) {
        if (isAnimating) return;
        prepareData(targetRootData); updateLevel2Numbering(targetRootData);
        const currentIds = getIds(rootData), targetIds = getIds(targetRootData);
        const deletedIds = new Set([...currentIds].filter(x => !targetIds.has(x)));
        const addedIds = new Set([...targetIds].filter(x => !currentIds.has(x)));
        
        if (deletedIds.size > 0) {
            isAnimating = true; 
            const delNodes = d3.selectAll('.markmap-node').filter(d => d && d.data && deletedIds.has(d.data._id)); 
            delNodes.classed('blink-red', true);
            setTimeout(() => { 
                delNodes.classed('blink-red', false); 
                commitState(targetRootData, isNewAction, shouldFit, () => {
                    if (addedIds.size > 0) { 
                        const newNodes = d3.selectAll('.markmap-node').filter(d => d && d.data && addedIds.has(d.data._id)); 
                        newNodes.classed('blink-green', true); 
                        setTimeout(() => { newNodes.classed('blink-green', false); isAnimating = false; }, 150); 
                    } else {
                        isAnimating = false;
                    }
                    if (cb) setTimeout(cb, 50); 
                });
            }, 150);
        } else {
            commitState(targetRootData, isNewAction, shouldFit, () => {
                if (addedIds.size > 0) { 
                    isAnimating = true; 
                    const newNodes = d3.selectAll('.markmap-node').filter(d => d && d.data && addedIds.has(d.data._id)); 
                    newNodes.classed('blink-green', true); 
                    setTimeout(() => { newNodes.classed('blink-green', false); isAnimating = false; }, 150); 
                } else {
                    isAnimating = false;
                }
                if (cb) setTimeout(cb, 50); 
            });
        }
    }
    
    document.getElementById('undo-btn').addEventListener('click', () => { 
        if (currentHistoryIndex > 0 && !isAnimating) { 
            window.formatInputState = {}; window.manualFormatStates = {};
            applyStateChange(JSON.parse(historyStack[--currentHistoryIndex]), false, false); 
            localStorage.setItem(STORAGE_KEY, historyStack[currentHistoryIndex]); 
            refreshButtons();
        }
    });
    
    document.getElementById('redo-btn').addEventListener('click', () => { 
        if (currentHistoryIndex < historyStack.length - 1 && !isAnimating) { 
            window.formatInputState = {}; window.manualFormatStates = {};
            applyStateChange(JSON.parse(historyStack[++currentHistoryIndex]), false, false); 
            localStorage.setItem(STORAGE_KEY, historyStack[currentHistoryIndex]); 
            refreshButtons();
        }
    });
    
    const { root, frontmatter } = transformer.transform(markdownText);
    
    const setBothOptions = (opts) => { 
        mm.setOptions(Object.assign({}, opts, { spacingHorizontal: 35 }));
        mmLeft.setOptions(Object.assign({}, opts, { spacingHorizontal: 35 })); 
    };
    
    setBothOptions({ 
        duration: 0, 
        ...(deriveOptions ? deriveOptions(frontmatter?.markmap) : {}),
        color: customColorFn
    });
    
    idCounter = 0; prepareData(root); originalRootData = JSON.parse(JSON.stringify(stripParent(root)));
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { rootData = JSON.parse(saved); } catch(e) { rootData = JSON.parse(JSON.stringify(originalRootData)); } } else { rootData = JSON.parse(JSON.stringify(originalRootData)); }
    prepareData(rootData); updateLevel2Numbering(rootData); commitState(rootData, true, true);

    document.getElementById('change-color-btn').addEventListener('click', () => {
        if (isAnimating) return;
        currentSchemeIndex = (currentSchemeIndex + 1) % colorSchemes.length;
        localStorage.setItem('mindmap_global_color_index', currentSchemeIndex);
        currentColorScale = d3.scaleOrdinal(colorSchemes[currentSchemeIndex]);
        setBothOptions({ color: customColorFn });
        commitState(rootData, false, false);
    });

    const pngScaleInput = document.getElementById('png-scale');
    const savePngBtn = document.getElementById('save-png-btn');

    pngScaleInput.addEventListener('focus', function() { this.select(); });
    pngScaleInput.addEventListener('click', function() { this.select(); });
    pngScaleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.select(); savePngBtn.click(); }
    });

    savePngBtn.addEventListener('click', () => {
        if (isAnimating) return;
        pngScaleInput.select(); 
        
        const btn = savePngBtn;
        const originalText = btn.innerText;
        btn.innerText = "处理中...";
        btn.disabled = true;

        const restoreBtn = () => { btn.innerText = originalText; btn.disabled = false; };

        try {
            const svgElement = document.getElementById('mindmap-svg');
            const svgLeftElement = document.getElementById('mindmap-svg-left');
            const gRightEl = svgElement.querySelector('g');
            const gLeftEl = svgLeftElement.querySelector('g');
            if (!gRightEl) throw new Error("未找到脑图节点");

            let gRightBBox = {x: 0, y: 0, width: 0, height: 0}; 
            let gLeftBBox = {x: 0, y: 0, width: 0, height: 0};
            
            try { gRightBBox = gRightEl.getBBox(); } catch(e) {} 
            const hasLeftNodes = gLeftEl && !!gLeftEl.querySelector('.markmap-node[data-depth="2"]');
            if (hasLeftNodes) {
                try { gLeftBBox = gLeftEl.getBBox(); } catch(e) {}
            }

            const ls = getLeftShiftUnits();
            
            let combinedMinX = gRightBBox.x;
            let combinedMaxX = gRightBBox.x + gRightBBox.width;
            let combinedMinY = gRightBBox.y;
            let combinedMaxY = gRightBBox.y + gRightBBox.height;

            if (hasLeftNodes && (gLeftBBox.width > 0 || gLeftBBox.height > 0)) {
                const leftVisibleX = -gLeftBBox.x - gLeftBBox.width + ls; 
                const leftRightX = -gLeftBBox.x + ls; 
                combinedMinX = Math.min(combinedMinX, leftVisibleX);
                combinedMaxX = Math.max(combinedMaxX, leftRightX);
                combinedMinY = Math.min(combinedMinY, gLeftBBox.y);
                combinedMaxY = Math.max(combinedMaxY, gLeftBBox.y + gLeftBBox.height);
            }

            const bbox = { x: combinedMinX, y: combinedMinY, width: combinedMaxX - combinedMinX, height: combinedMaxY - combinedMinY };
            const padding = 50; 
            const width = Math.ceil(bbox.width + padding * 2);
            const height = Math.ceil(bbox.height + padding * 2);

            const clone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            clone.setAttribute('width', width);
            clone.setAttribute('height', height);
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            const gRightClone = gRightEl.cloneNode(true);
            gRightClone.setAttribute('transform', `translate(${padding - bbox.x}, ${padding - bbox.y}) scale(1)`);
            
            const cloneStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            let globalCss = '';
            try { const st = svgElement.querySelector('style'); if (st) globalCss = st.textContent; } catch(e) {}
            cloneStyle.textContent = globalCss + `
                .markmap-node circle { r: 3.2px !important; transform: scale(0.8); transform-origin: center; transform-box: fill-box; }
                #mindmap-svg .markmap-node:not([data-depth="1"]) > foreignObject, #mindmap-svg .markmap-node:not([data-depth="1"]) > text { transform: translateX(-7px) !important; }
                #mindmap-svg-left .markmap-node:not([data-depth="1"]) > foreignObject, #mindmap-svg-left .markmap-node:not([data-depth="1"]) > text { transform: scaleX(-1) translateX(-100%) translateX(7px) !important; transform-origin: 0 0; transform-box: fill-box; text-align: left !important; }
                #mindmap-svg-left .markmap-node > circle { transform: scaleX(-1) scale(0.8); transform-origin: center; transform-box: fill-box; }
                #mindmap-svg-left .markmap-node[data-depth="1"] > foreignObject, #mindmap-svg-left .markmap-node[data-depth="1"] > text, #mindmap-svg-left .markmap-node[data-depth="1"] > line { display: none !important; }
            `;
            clone.appendChild(cloneStyle); 
            clone.appendChild(gRightClone);
            
            let gLeftClone = null;
            if (hasLeftNodes) {
                gLeftClone = gLeftEl.cloneNode(true);
                gLeftClone.id = "mindmap-svg-left";
                gLeftClone.setAttribute('transform', `translate(${padding - bbox.x + ls}, ${padding - bbox.y}) scale(1) scale(-1, 1)`);
                clone.appendChild(gLeftClone);
            }

            const originalFos = [];
            svgElement.querySelectorAll('foreignObject').forEach(fo => originalFos.push(fo));
            if (hasLeftNodes) {
                svgLeftElement.querySelectorAll('foreignObject').forEach(fo => originalFos.push(fo));
            }
            
            const clonedFos = clone.querySelectorAll('foreignObject');
            let foIndex = 0;
            clonedFos.forEach((fo) => {
                const origFo = originalFos[foIndex++];
                if (!origFo) return;
                
                const rootStyle = window.getComputedStyle(origFo.firstElementChild || origFo);
                
                const x = parseFloat(fo.getAttribute('x') || 0);
                const y = parseFloat(fo.getAttribute('y') || 0);
                const h = parseFloat(fo.getAttribute('height') || 20);
                const isLeftNode = gLeftClone ? gLeftClone.contains(fo) : false;
                
                const fontSizeNum = parseFloat(rootStyle.fontSize) || 14;
                const lineHeight = parseFloat(rootStyle.lineHeight) || (fontSizeNum * 1.3);
                
                let lineCount = 1;
                const countLines = (node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName.toLowerCase() === 'br') lineCount++;
                        node.childNodes.forEach(countLines);
                    }
                };
                countLines(origFo);
                
                const totalTextHeight = lineCount * lineHeight;
                const startY = y + (h - totalTextHeight) / 2 + (fontSizeNum * 0.85);
                
                const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                textNode.setAttribute('x', x);
                textNode.setAttribute('font-family', rootStyle.fontFamily || 'sans-serif');
                textNode.setAttribute('font-size', rootStyle.fontSize || '14px');
                textNode.setAttribute('fill', rootStyle.color || '#333');
                
                const isLeftRoot = isLeftNode && fo.closest('.markmap-node[data-depth="1"]');
                if (!isLeftRoot) {
                    let currentY = startY;
                    let currentLineSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                    currentLineSpan.setAttribute('x', x);
                    currentLineSpan.setAttribute('y', currentY);
                    textNode.appendChild(currentLineSpan);

                    const traverseDOM = (node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            let text = node.textContent;
                            text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); 
                            text = text.replace(/[ \n\r\t]+/g, ' '); 
                            if (text === '') return;
                            
                            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                            tspan.setAttribute('xml:space', 'preserve');
                            tspan.textContent = text;
                            
                            const parentEl = node.parentElement;
                            if (parentEl) {
                                const style = window.getComputedStyle(parentEl);
                                if (style.color) tspan.setAttribute('fill', style.color);
                                if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 600) {
                                    tspan.setAttribute('font-weight', 'bold');
                                }
                                if (style.fontStyle === 'italic') {
                                    tspan.setAttribute('font-style', 'italic');
                                }
                            }
                            currentLineSpan.appendChild(tspan);
                            
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            const tag = node.tagName.toLowerCase();
                            if (tag === 'br') {
                                currentY += lineHeight;
                                currentLineSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                                currentLineSpan.setAttribute('x', isLeftNode ? -x : x);
                                currentLineSpan.setAttribute('y', currentY);
                                textNode.appendChild(currentLineSpan);
                            } else {
                                const style = window.getComputedStyle(node);
                                if (style.display === 'none') return;
                                node.childNodes.forEach(traverseDOM);
                            }
                        }
                    };

                    traverseDOM(origFo);

                    if (textNode.childNodes.length === 0 || (textNode.childNodes.length === 1 && textNode.childNodes[0].childNodes.length === 0)) {
                        const textarea = document.createElement('textarea');
                        textarea.innerHTML = fo.textContent || ' ';
                        textNode.setAttribute('y', y + h * 0.7);
                        textNode.textContent = textarea.value.replace(/[\u200B-\u200D\uFEFF]/g, '');
                    }
                }

                fo.parentNode.replaceChild(textNode, fo);
            });

            const svgData = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const imgSrc = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let scaleInput = parseFloat(pngScaleInput.value) || 2.5;
                    const scale = Math.max(0.5, Math.min(10, scaleInput)); 
                    
                    canvas.width = width * scale;
                    canvas.height = height * scale;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.scale(scale, scale);
                    
                    ctx.fillStyle = '#f8f9fa';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0);
                    
                    let docName = '未命名';
                    if (rootData && rootData.content) {
                        const textarea = document.createElement('textarea');
                        textarea.innerHTML = rootData.content.replace(/<[^>]+>/g, '').trim();
                        docName = textarea.value || '未命名文档';
                    }
                    
                    const dataURL = canvas.toDataURL('image/png', 1.0); 
                    const a = document.createElement('a');
                    a.download = `${docName}_脑图.png`;
                    a.href = dataURL; 
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                } catch (e) {
                } finally {
                    URL.revokeObjectURL(imgSrc);
                    restoreBtn();
                }
            };
            
            img.onerror = (e) => {
                URL.revokeObjectURL(imgSrc);
                restoreBtn();
            };
            
            img.src = imgSrc;

        } catch (globalErr) {
            restoreBtn();
        }
    });

    const btnPortrait = document.getElementById('btn-portrait');
    const btnLandscape = document.getElementById('btn-landscape');
    const printScaleInput = document.getElementById('print-scale');
    const printBtn = document.getElementById('print-btn');
    
    printScaleInput.addEventListener('focus', function() { this.select(); });
    printScaleInput.addEventListener('click', function() { this.select(); });
    
    printScaleInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); this.select(); printBtn.click(); }
    });
    
    btnPortrait.addEventListener('click', () => { 
        window.isManualPrintOrientation = true; 
        btnPortrait.classList.add('active'); 
        btnLandscape.classList.remove('active'); 
    });
    btnLandscape.addEventListener('click', () => { 
        window.isManualPrintOrientation = true; 
        btnLandscape.classList.add('active'); 
        btnPortrait.classList.remove('active'); 
    });

    printBtn.addEventListener('click', () => {
        printScaleInput.select(); 
        const scaleInput = parseFloat(printScaleInput.value) || 100;
        const isLandscape = btnLandscape.classList.contains('active');
        const gRight = svgEl.querySelector('g');
        const gLeft = svgLeftEl.querySelector('g');
        if (!gRight) return;

        let bboxRight = {x:0, y:0, width:0, height:0}; 
        try { bboxRight = gRight.getBBox(); } catch(e) {} 
        
        const hasLeftNodes = gLeft && !!gLeft.querySelector('.markmap-node[data-depth="2"]');
        let bboxLeft = {x:0, y:0, width:0, height:0};
        if (hasLeftNodes) {
            try { bboxLeft = gLeft.getBBox(); } catch(e) {}
        }
        
        const ls = getLeftShiftUnits();
        
        let minX = bboxRight.x;
        let maxX = bboxRight.x + bboxRight.width;
        let minY = bboxRight.y;
        let maxY = bboxRight.y + bboxRight.height;

        if (hasLeftNodes && (bboxLeft.width > 0 || bboxLeft.height > 0)) {
            const leftVisibleX = -bboxLeft.x - bboxLeft.width + ls;
            const leftRightX = -bboxLeft.x + ls;
            minX = Math.min(minX, leftVisibleX);
            maxX = Math.max(maxX, leftRightX);
            minY = Math.min(minY, bboxLeft.y);
            maxY = Math.max(maxY, bboxLeft.y + bboxLeft.height);
        }
        const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

        const origWidth = svgEl.style.width;
        const origHeight = svgEl.style.height;
        const origViewBox = svgEl.getAttribute('viewBox');
        const origTransformRight = gRight.getAttribute('transform');
        const origTransformLeft = gLeft ? gLeft.getAttribute('transform') : null;
        const origPreserve = svgEl.getAttribute('preserveAspectRatio');

        const printStyle = document.createElement('style');
        printStyle.id = 'print-custom-style';
        printStyle.innerHTML = `
            @media print {
                @page { size: ${isLandscape ? 'landscape' : 'portrait'}; margin: 0; }
                body, html { background: white !important; margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: visible !important; }
                #toolbar, #error-msg, #edit-container { display: none !important; }
                #mindmap-svg, #mindmap-svg-left {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: ${scaleInput}% !important;
                    height: ${scaleInput}% !important;
                    overflow: visible !important;
                }
                #mindmap-svg .markmap-node:not([data-depth="1"]) > foreignObject, #mindmap-svg .markmap-node:not([data-depth="1"]) > text { transform: translateX(-7px) !important; }
                #mindmap-svg-left .markmap-node:not([data-depth="1"]) > foreignObject, #mindmap-svg-left .markmap-node:not([data-depth="1"]) > text { transform: scaleX(-1) translateX(-100%) translateX(7px) !important; transform-origin: 0 0; transform-box: fill-box; text-align: left !important; }
                #mindmap-svg-left .markmap-node > circle { transform: scaleX(-1) scale(0.8); transform-origin: center; transform-box: fill-box; }
                #mindmap-svg-left .markmap-node[data-depth="1"] > foreignObject, #mindmap-svg-left .markmap-node[data-depth="1"] > text, #mindmap-svg-left .markmap-node[data-depth="1"] > line { display: none !important; }
            }
        `;
        document.head.appendChild(printStyle);

        svgEl.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
        svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        gRight.setAttribute('transform', '');
        if (gLeft) {
            if (!hasLeftNodes) {
                svgLeftEl.style.display = 'none'; 
            } else {
                svgLeftEl.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
                svgLeftEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');
                gLeft.setAttribute('transform', `translate(${ls}, 0) scale(-1, 1)`);
            }
        }

        let isCleaned = false;
        const cleanup = () => {
            if (isCleaned) return;
            isCleaned = true;
            if (document.getElementById('print-custom-style')) document.head.removeChild(printStyle);
            svgEl.style.width = origWidth;
            svgEl.style.height = origHeight;
            if (origViewBox) svgEl.setAttribute('viewBox', origViewBox); else svgEl.removeAttribute('viewBox');
            if (origPreserve) svgEl.setAttribute('preserveAspectRatio', origPreserve); else svgEl.removeAttribute('preserveAspectRatio');
            gRight.setAttribute('transform', origTransformRight || '');
            if (gLeft) {
                svgLeftEl.style.display = ''; 
                svgLeftEl.style.width = origWidth;
                svgLeftEl.style.height = origHeight;
                if (origViewBox) svgLeftEl.setAttribute('viewBox', origViewBox); else svgLeftEl.removeAttribute('viewBox');
                if (origPreserve) svgLeftEl.setAttribute('preserveAspectRatio', origPreserve); else svgLeftEl.removeAttribute('preserveAspectRatio');
                gLeft.setAttribute('transform', origTransformLeft || '');
            }
            window.removeEventListener('afterprint', cleanup);
        };

        window.addEventListener('afterprint', cleanup);
        setTimeout(() => {
            window.print();
            setTimeout(cleanup, 1500); 
        }, 150);
    });
}

if (window.__MINDMAP_BOOTED === true && typeof runMindMapLogic === 'function') {
    runMindMapLogic();
}
