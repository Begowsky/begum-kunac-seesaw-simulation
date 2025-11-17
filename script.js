// weight colors
const WEIGHT_COLORS = {
  1: "#ebdc07ff",
  2: "#ff8c00ff",
  3: "#FF69B4",
  4: "#DC143C",
  5: "#5fd2e6ff",
  6: "#aa62eaff",
  7: "#50C878",
  8: "#4B0082",
  9: "#01796F",
  10: "#191970"
};

// this function helps to create the weight objects proportional to their weights
function sizeFromWeight(weight) {
  const minSize = 26;   // 1 kg
  const maxSize = 62;   // 10 kg
  const w = Math.max(1, Math.min(10, weight));
  return minSize + ((w - 1) * (maxSize - minSize)) / 9;
}

class TorqueCalculator {
  constructor() {
    this.objects = [];
  }
  addObject(o) {
    this.objects.push(o);
  }
  clear() {
    this.objects = [];
  }
  compute() {
    let leftT = 0, rightT = 0;
    let leftW = 0, rightW = 0;
    for (const o of this.objects) {
      const d = Math.abs(o.offsetX);
      if (o.offsetX < 0) {
        leftT += o.weight * d;
        leftW += o.weight;
      } else {
        rightT += o.weight * d;
        rightW += o.weight;
      }
    }
    return { leftT, rightT, leftW, rightW };
  }
}

class SeesawObject {
  constructor(params) {
    this.weight = params.weight;
    this.offsetX = params.offsetX;
    this.plankArea = params.plankArea;
    this.color = params.color || WEIGHT_COLORS[this.weight] || this.randomColor();
    this.shapeType = params.shapeType || "circle";
    this.size = sizeFromWeight(this.weight);
    this.x = params.x;
    this.y = params.y;
    this.el = document.createElement("div");
    this.el.className = "weight";
    this.el.textContent = this.weight;
    this.el.style.background = this.color;
    this.el.style.position = "absolute";
    this.el.style.width = this.size + "px";
    this.el.style.height = this.size + "px";
    this.el.style.borderRadius =
      this.shapeType === "square" ? "4px" : "50%";
    if (this.x == null || this.y == null) {
      const halfLength = this.plankArea.clientWidth / 2;
      const plankTop = 6;
      const overlap = 1;
      const bottomY = plankTop + overlap;
      const landing = bottomY - this.size;
      this.x = halfLength + this.offsetX - this.size / 2;
      this.y = landing;
    }
    this.el.style.left = this.x + "px";
    this.el.style.top = this.y + "px";
    this.plankArea.appendChild(this.el);
  }
  remove() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
  randomColor() {
    return `hsl(${Math.floor(Math.random()*360)} 68% 46%)`;
  }
}

class SeesawSimulation {
  constructor() {
    this.storageKey = "begum-kunac-seesaw";
    this.plankArea = document.getElementById("plankArea");
    this.plank = document.getElementById("plank");
    this.pivot = document.getElementById("pivot");
    this.pivotBase = document.getElementById("pivotBase");
    this.leftWeightEl = document.getElementById("leftWeight");
    this.rightWeightEl = document.getElementById("rightWeight");
    this.nextWeightEl = document.getElementById("nextWeight");
    this.tiltAngleEl = document.getElementById("tiltAngle");
    this.leftTorqueText = document.getElementById("leftTorqueText");
    this.rightTorqueText = document.getElementById("rightTorqueText");
    this.hoverOffsetEl = document.getElementById("hoverOffsetText");
    this.scale = document.getElementById("scale");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.undoBtn = document.getElementById("undoBtn");
    this.redoBtn = document.getElementById("redoBtn");
    // added control options
    this.shapeRadios = document.querySelectorAll('input[name="shape"]');
    this.lengthSlider = document.getElementById("lengthSlider");
    this.lengthValue = document.getElementById("lengthValue");
    this.speedRadios = document.querySelectorAll('input[name="speed"]');
    this.logBox = document.getElementById("logBox");
    const checkedShape = document.querySelector('input[name="shape"]:checked');
    this.shapeType = checkedShape ? checkedShape.value : "circle";
    const checkedSpeed = document.querySelector('input[name="speed"]:checked');
    this.speedSetting = checkedSpeed ? checkedSpeed.value : "medium";
    this.angle = 0;
    this.targetAngle = 0;
    this.angVel = 0;
    this.MAX_ANGLE = 30;
    this.ANGLE_DIV = 10;
    this.stiffness = 0.02;
    this.damping = this.dampingFromSpeed(this.speedSetting);
    this.isPaused = false;
    this.isDropping = false;
    this.torqueCalc = new TorqueCalculator();
    // this will generate first next weight
    this.nextWeight = this.generateRandomWeight();
    this.nextWeightEl.textContent = this.nextWeight + " kg";
    if (this.lengthSlider && this.lengthValue) {
      const w = this.plankArea.clientWidth;
      this.lengthSlider.value = w;
      this.lengthValue.textContent = String(w);
    }
    // this holds the log list
    this.logEntries = [];
    // this holds the history for undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.renderScale();
    this.bindEvents();
    // this will restore the state and history
    this.loadState();
    this.positionPlankRelativeToGround();
    this.positionPivot();
    this.updateSliderEnabled();
    // this will render the log
    this.renderLog();
    // if there is no history loaded, push the initial snapshot
    if (this.history.length === 0) {
      this.pushHistory();
    }
    // after restoring page is shown
    document.body.classList.remove("preload");
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }
  dampingFromSpeed(speed) {
    if (speed === "slow") return 0.1;
    if (speed === "fast") return 0.7;
    return 0.4; // medium speed is the default
  }
  generateRandomWeight() {
    return Math.floor(Math.random() * 10) + 1;
  }
  renderScale() {
    const w = this.plank.clientWidth;
    const tick = 40;
    const count = Math.floor(w / tick);
    const half = Math.floor(count / 2);
    let html = "";
    for (let i = -half; i <= half; i++) {
      html += `<div style="width:${tick}px;text-align:center">${i}</div>`;
    }
    this.scale.innerHTML = html;
  }
  bindEvents() {
    this.plankArea.addEventListener("click", (e) => this.onClick(e));
    this.plankArea.addEventListener("mousemove", (e) => this.onHover(e));
    this.plankArea.addEventListener("mouseleave", () => this.clearHover());
    window.addEventListener("resize", () => {
      this.renderScale();
      this.positionPlankRelativeToGround();
      this.positionPivot();
    });
    this.pauseBtn.addEventListener("click", () => this.togglePause());
    this.resetBtn.addEventListener("click", () => this.resetSimulation());
    if (this.undoBtn) {
      this.undoBtn.addEventListener("click", () => this.undo());
    }
    if (this.redoBtn) {
      this.redoBtn.addEventListener("click", () => this.redo());
    }
    // radios for shape choice
    this.shapeRadios.forEach((r) => {
      r.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.setShape(e.target.value);
          this.pushHistory();
          this.saveState();
        }
      });
    });
    // radios for speed choice
    this.speedRadios.forEach((r) => {
      r.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.setSpeed(e.target.value);
          this.pushHistory();
          this.saveState();
        }
      });
    });
    // slider for length
    if (this.lengthSlider) {
      this.lengthSlider.addEventListener("input", (e) => {
        // can change the length if there are no weight objects
        if (this.lengthSlider.disabled) return;
        const w = parseInt(e.target.value, 10) || 640;
        this.setPlankWidth(w);
        this.pushHistory();
        this.saveState();
      });
    }
    window.addEventListener("beforeunload", () => this.saveState());
  }
  // it should be disabled if there are weight objects on the seesaw
  updateSliderEnabled() {
    if (!this.lengthSlider) return;
    const hasObjects = this.torqueCalc.objects.length > 0;
    this.lengthSlider.disabled = hasObjects;
  }
  updateUndoRedoButtons() {
    if (this.undoBtn) {
      this.undoBtn.disabled = this.historyIndex <= 0;
    }
    if (this.redoBtn) {
      this.redoBtn.disabled =
        this.historyIndex < 0 || this.historyIndex >= this.history.length - 1;
    }
  }
  // this takes the snapshot of the current state for the history (undo/redo) and the local storage
  createSnapshot() {
    const serializableObjects = this.torqueCalc.objects.map((o) => ({
      weight: o.weight,
      offsetX: o.offsetX,
      x: o.x,
      color: o.color
    }));
    return {
      objects: serializableObjects,
      nextWeight: this.nextWeight,
      angle: this.angle,
      targetAngle: this.targetAngle,
      isPaused: this.isPaused,
      shapeType: this.shapeType,
      plankWidth: this.plankArea.clientWidth,
      speedSetting: this.speedSetting,
      log: [...this.logEntries]
    };
  }
  // this pushes the snapshot of the current state on history
  pushHistory() {
    const snap = this.createSnapshot();
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(snap);
    this.historyIndex = this.history.length - 1;
    this.updateUndoRedoButtons();
  }
  restoreSnapshot(data) { // undo, redo, loadState
    if (!data) return;
    // existing objects are cleared first
    for (const obj of this.torqueCalc.objects) {
      if (obj.remove) obj.remove();
    }
    this.torqueCalc.clear();
    // parameters are restored 
    if (data.shapeType === "square" || data.shapeType === "circle") {
      this.shapeType = data.shapeType;
    }
    if (typeof data.plankWidth === "number") {
      this.setPlankWidth(data.plankWidth);
    }
    if (["slow", "medium", "fast"].includes(data.speedSetting)) {
      this.speedSetting = data.speedSetting;
    } else {
      this.speedSetting = "medium";
    }
    this.damping = this.dampingFromSpeed(this.speedSetting);
    this.shapeRadios.forEach((r) => {
      r.checked = r.value === this.shapeType;
    });
    this.speedRadios.forEach((r) => {
      r.checked = r.value === this.speedSetting;
    });
    // this recreates the objects
    if (Array.isArray(data.objects)) {
      for (const o of data.objects) {
        if (typeof o.weight !== "number" || typeof o.offsetX !== "number") continue;
        const obj = new SeesawObject({
          weight: o.weight,
          offsetX: o.offsetX,
          plankArea: this.plankArea,
          x: null,
          y: null,
          color: o.color,
          shapeType: this.shapeType
        });
        this.torqueCalc.addObject(obj);
      }
    }
    // this restores the next weight
    if (typeof data.nextWeight === "number") {
      this.nextWeight = data.nextWeight;
    } else {
      this.nextWeight = this.generateRandomWeight();
    }
    this.nextWeightEl.textContent = this.nextWeight + " kg";
    // this restores flags and the angle
    this.isPaused = !!data.isPaused;
    this.pauseBtn.textContent = this.isPaused ? "Resume" : "Pause";
    this.angle = typeof data.angle === "number" ? data.angle : 0;
    this.targetAngle = typeof data.targetAngle === "number" ? data.targetAngle : this.angle;
    this.angVel = 0;
    this.updateTargetAngle();
    this.plankArea.style.transform = `rotate(${this.angle}deg)`;
    this.tiltAngleEl.textContent = this.angle.toFixed(2) + "°";
    // this restores the log
    if (Array.isArray(data.log)) {
      this.logEntries = [...data.log];
    } else {
      this.logEntries = [];
    }
    this.renderLog();
    this.updateSliderEnabled();
    this.updateUndoRedoButtons();
  }
  setShape(shape) {
    this.shapeType = shape === "square" ? "square" : "circle";
    const radiusValue = this.shapeType === "square" ? "4px" : "50%";
    this.shapeRadios.forEach((r) => {
      r.checked = r.value === this.shapeType;
    });
    for (const obj of this.torqueCalc.objects) {
      obj.shapeType = this.shapeType;
      obj.el.style.borderRadius = radiusValue;
    }
  }
  setSpeed(speed) {
    if (!["slow", "medium", "fast"].includes(speed)) {
      speed = "medium";
    }
    this.speedSetting = speed;
    this.damping = this.dampingFromSpeed(speed);
    this.speedRadios.forEach((r) => {
      r.checked = r.value === speed;
    });
  }
  setPlankWidth(width) {
    this.plankArea.style.width = width + "px";
    this.renderScale();
    const halfLength = width / 2;
    for (const obj of this.torqueCalc.objects) {
      const size = obj.size;
      obj.x = halfLength + obj.offsetX - size / 2;
      obj.el.style.left = obj.x + "px";
    }
    this.positionPlankRelativeToGround();
    this.positionPivot();
    if (this.lengthSlider) {
      this.lengthSlider.value = width;
    }
    if (this.lengthValue) {
      this.lengthValue.textContent = String(width);
    }
  }
  positionPlankRelativeToGround() {
    const wrap = this.plankArea.parentElement;
    if (!wrap) return;
    const groundEl = wrap.querySelector(".ground");
    if (!groundEl) return;
    const groundTopInWrap = groundEl.offsetTop;
    const halfLength = this.plankArea.clientWidth / 2;
    const angleRad = (this.MAX_ANGLE * Math.PI) / 180;
    const maxDrop = halfLength * Math.sin(angleRad);
    const areaHeight = this.plankArea.clientHeight;
    const centerYCurrent = this.plankArea.offsetTop + areaHeight / 2;
    const centerYNeeded = groundTopInWrap - maxDrop;
    const delta = centerYNeeded - centerYCurrent;
    const currentTop = parseFloat(getComputedStyle(this.plankArea).top) || 0;
    this.plankArea.style.top = (currentTop + delta) + "px";
  }
  positionPivot() {
    const wrap = this.plankArea.parentElement;
    if (!wrap || !this.pivot) return;
    const areaBounds = this.plankArea.getBoundingClientRect();
    const wrapBounds = wrap.getBoundingClientRect();
    const centerY = areaBounds.top + areaBounds.height / 2;
    const topInWrap = centerY - wrapBounds.top;
    this.pivot.style.top = `${topInWrap}px`;
    const groundEl = wrap.querySelector(".ground");
    if (groundEl && this.pivotBase) {
      const groundTopInWrap = groundEl.offsetTop;
      const triangleHeight = 30;
      const baseTop = topInWrap + triangleHeight;
      const extra = 25;
      const height = Math.max(0, groundTopInWrap - baseTop + extra);
      this.pivotBase.style.top = `${baseTop}px`;
      this.pivotBase.style.height = `${height}px`;
    }
  }
  addLogEntry(text) {
    const entry = text;
    this.logEntries.unshift(entry);
    if (this.logEntries.length > 100) {
      this.logEntries.pop();
    }
    this.renderLog();
  }
  renderLog() {
    if (!this.logBox) return;
    this.logBox.innerHTML = this.logEntries
      .map(e => `<div class="log-entry">${e}</div>`)
      .join("");
  }
  onHover(e) {
    if (!this.hoverOffsetEl) return;
    const rect = this.plankArea.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const theta = (this.angle * Math.PI) / 180;
    const proj = dx * Math.cos(theta) + dy * Math.sin(theta);
    const halfLength = this.plankArea.clientWidth / 2;
    let offsetFromPivot = Math.max(-halfLength, Math.min(halfLength, proj));
    const px = Math.round(offsetFromPivot);
    const sign = px > 0 ? "+" : px < 0 ? "" : "";
    this.hoverOffsetEl.textContent = `Distance from center: ${sign}${px} px`;
  }
  clearHover() {
    if (!this.hoverOffsetEl) return;
    this.hoverOffsetEl.textContent = "Distance from center: 0 px";
  }
  onClick(e) {
    if (this.isPaused || this.isDropping) return;
    const rect = this.plankArea.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const theta = (this.angle * Math.PI) / 180;
    const proj = dx * Math.cos(theta) + dy * Math.sin(theta);
    const halfLength = this.plankArea.clientWidth / 2;
    let offsetFromPivot = Math.max(-halfLength, Math.min(halfLength, proj));
    if (Math.abs(offsetFromPivot) < 1) {
      offsetFromPivot = offsetFromPivot >= 0 ? 1 : -1;
    }
    const weight = this.nextWeight;
    const side = offsetFromPivot < 0 ? "left" : "right";
    const px = Math.round(Math.abs(offsetFromPivot));
    this.addLogEntry(`${weight}kg dropped on ${side} side at ${px}px from center`);
    const obj = new SeesawObject({
      weight,
      offsetX: offsetFromPivot,
      plankArea: this.plankArea,
      x: null,
      y: null,
      color: null,
      shapeType: this.shapeType
    });
    obj.el.style.opacity = "0";
    this.torqueCalc.addObject(obj);
    this.updateTargetAngle();
    this.updateSliderEnabled();
    const finalRect = obj.el.getBoundingClientRect();
    const ghostSize = sizeFromWeight(obj.weight);
    const ghost = document.createElement("div");
    ghost.className = "weight";
    ghost.textContent = obj.weight;
    ghost.style.background = obj.color;
    ghost.style.position = "fixed";
    ghost.style.width = ghostSize + "px";
    ghost.style.height = ghostSize + "px";
    ghost.style.borderRadius =
      this.shapeType === "square" ? "4px" : "50%";
    ghost.style.left = finalRect.left + "px";
    ghost.style.top = (finalRect.top - ghostSize * 3) + "px";
    ghost.style.transition = "top 500ms cubic-bezier(.2,.9,.2,1)";
    ghost.style.zIndex = "999"; 
    document.body.appendChild(ghost);
    this.isDropping = true;
    requestAnimationFrame(() => {
      ghost.style.top = finalRect.top + "px";
    });
    setTimeout(() => {
      ghost.remove();
      obj.el.style.opacity = "1";
      this.isDropping = false;
    }, 550);
    // this will generate next weight
    this.nextWeight = this.generateRandomWeight();
    this.nextWeightEl.textContent = this.nextWeight + " kg";
    this.pushHistory();
    this.saveState();
  }
  updateTargetAngle() {
    const t = this.torqueCalc.compute();
    const diff = t.rightT - t.leftT;
    this.targetAngle = Math.max(
      -this.MAX_ANGLE,
      Math.min(this.MAX_ANGLE, diff / this.ANGLE_DIV)
    );
    this.leftWeightEl.textContent = t.leftW + " kg";
    this.rightWeightEl.textContent = t.rightW + " kg";
    this.leftTorqueText.textContent = "Left torque: " + Math.round(t.leftT);
    this.rightTorqueText.textContent = "Right torque: " + Math.round(t.rightT);
  }
  togglePause() {
    this.isPaused = !this.isPaused;
    this.pauseBtn.textContent = this.isPaused ? "Resume" : "Pause";
    this.pushHistory();
    this.saveState();
  }
  resetSimulation() {
    // this will make weight objects disappear
    for (const obj of this.torqueCalc.objects) {
      if (obj.remove) obj.remove();
    }
    this.torqueCalc.clear();
    // this will reset the physics
    this.angle = 0;
    this.targetAngle = 0;
    this.angVel = 0;
    this.plankArea.style.transform = `rotate(0deg)`;
    this.tiltAngleEl.textContent = "0°";
    // this will reset the seesaw status
    this.leftWeightEl.textContent = "0 kg";
    this.rightWeightEl.textContent = "0 kg";
    this.leftTorqueText.textContent = "Left torque: 0";
    this.rightTorqueText.textContent = "Right torque: 0";
    // this resets hover
    if (this.hoverOffsetEl) {
      this.hoverOffsetEl.textContent = "Hover: 0 px";
    }
    // this will reset the next weight
    this.nextWeight = this.generateRandomWeight();
    this.nextWeightEl.textContent = this.nextWeight + " kg";
    // it is running
    this.isPaused = false;
    this.isDropping = false;
    this.pauseBtn.textContent = "Pause";
    // this resets the logs
    this.logEntries = [];
    this.renderLog();
    this.updateSliderEnabled();
    // this resets the history for this cleaned state
    this.history = [];
    this.historyIndex = -1;
    this.pushHistory();
    this.saveState();
    // this recalculates the geometry after resetting
    this.positionPlankRelativeToGround();
    this.positionPivot();
  }
  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    const snap = this.history[this.historyIndex];
    this.restoreSnapshot(snap);
    this.saveState();
  }
  redo() {
    if (this.historyIndex < 0 || this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    const snap = this.history[this.historyIndex];
    this.restoreSnapshot(snap);
    this.saveState();
  }
  saveState() {
    try {
      const data = {
        history: this.history,
        historyIndex: this.historyIndex
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save seesaw state", e);
    }
  }
  loadState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data) return;
      if (Array.isArray(data.history)) {
        this.history = data.history;
        this.historyIndex =
          typeof data.historyIndex === "number"
            ? data.historyIndex
            : this.history.length - 1;
        const snap = this.history[this.historyIndex];
        if (snap) {
          this.restoreSnapshot(snap);
        }
        this.updateUndoRedoButtons();
      } else if (Array.isArray(data.objects)) {
        this.history = [data];
        this.historyIndex = 0;
        this.restoreSnapshot(data);
        this.updateUndoRedoButtons();
      }
    } catch (e) {
      console.error("Failed to load seesaw state", e);
    }
  }
  animate() {
    if (!this.isPaused && !this.isDropping) {
      const diff = this.targetAngle - this.angle;
      this.angVel += diff * this.stiffness;
      this.angVel *= this.damping;
      this.angle += this.angVel;
      this.plankArea.style.transform = `rotate(${this.angle}deg)`;
      this.tiltAngleEl.textContent = this.angle.toFixed(2) + "°";
    }
    requestAnimationFrame(this.animate);
  }
}

new SeesawSimulation();
