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
  constructor(weight, offsetX, plankArea, plankBounds, areaBounds) {
    this.weight = weight;
    this.offsetX = offsetX;
    this.el = document.createElement("div");
    this.el.className = "weight";
    this.el.textContent = weight;
    this.el.style.background = this.randomColor();
    const x = (plankBounds.left - areaBounds.left) + (plankBounds.width/2 + offsetX) - 22;
    this.el.style.left = x + "px";
    this.el.style.top = "-140px";
    this.el.style.transition = "top 500ms cubic-bezier(.2,.9,.2,1)";
    plankArea.appendChild(this.el);
    requestAnimationFrame(() => {
      const landing = -(44/2 - 6);
      this.el.style.top = landing + "px";
    });
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
    this.plankArea = document.getElementById("plankArea");
    this.plank = document.getElementById("plank");
    this.pivot = document.getElementById("pivot");
    this.leftWeightEl = document.getElementById("leftWeight");
    this.rightWeightEl = document.getElementById("rightWeight");
    this.nextWeightEl = document.getElementById("nextWeight");
    this.tiltAngleEl = document.getElementById("tiltAngle");
    this.leftTorqueText = document.getElementById("leftTorqueText");
    this.rightTorqueText = document.getElementById("rightTorqueText");
    this.scale = document.getElementById("scale");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.angle = 0;
    this.targetAngle = 0;
    this.angVel = 0;
    this.MAX_ANGLE = 30;
    this.ANGLE_DIV = 10;
    this.stiffness = 0.02;
    this.damping = 0.6;
    this.isPaused = false;
    this.torqueCalc = new TorqueCalculator();
    // this will generate first next weight
    this.nextWeight = this.generateRandomWeight();
    this.nextWeightEl.textContent = this.nextWeight + " kg";
    this.renderScale();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
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
    window.addEventListener("resize", () => this.renderScale());
    this.pauseBtn.addEventListener("click", () => this.togglePause());
    this.resetBtn.addEventListener("click", () => this.resetSimulation());
  }
  onClick(e) {
    if (this.isPaused) return;
    const plankBounds = this.plank.getBoundingClientRect();
    const areaBounds = this.plankArea.getBoundingClientRect();
    let localX = e.clientX - plankBounds.left;
    localX = Math.max(0, Math.min(plankBounds.width, localX));
    let offsetFromPivot = localX - plankBounds.width/2;
    if (offsetFromPivot === 0) offsetFromPivot = 5;
    const weight = this.nextWeight;
    const obj = new SeesawObject(
      weight,
      offsetFromPivot,
      this.plankArea,
      plankBounds,
      areaBounds
    );
    this.torqueCalc.addObject(obj);
    this.updateTargetAngle();
    // this will generate next weight
    this.nextWeight = this.generateRandomWeight();
    this.nextWeightEl.textContent = this.nextWeight + " kg";
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
    this.pivot.style.transform = `translateX(-50%) rotate(0deg)`;
    this.tiltAngleEl.textContent = "0°";
    // this will reset the seesaw status
    this.leftWeightEl.textContent = "0 kg";
    this.rightWeightEl.textContent = "0 kg";
    this.leftTorqueText.textContent = "Left torque: 0";
    this.rightTorqueText.textContent = "Right torque: 0";
    // this will reset the next weight
    this.nextWeight = this.generateRandomWeight();
    this.nextWeightEl.textContent = this.nextWeight + " kg";
    // it is running
    this.isPaused = false;
    this.pauseBtn.textContent = "Pause";
  }
  animate() {
    if (!this.isPaused) {
      const diff = this.targetAngle - this.angle;
      this.angVel += diff * this.stiffness;
      this.angVel *= this.damping;
      this.angle += this.angVel;
      this.plankArea.style.transform = `rotate(${this.angle}deg)`;
      this.pivot.style.transform = `translateX(-50%) rotate(${-this.angle}deg)`;
      this.tiltAngleEl.textContent = this.angle.toFixed(2) + "°";
    }
    requestAnimationFrame(this.animate);
  }
}

new SeesawSimulation();
