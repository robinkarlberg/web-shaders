let canvas;
let lib3d;

const start = () => {
	canvas = document.getElementById("canvas");

	lib3d = new Lib3d(canvas);

	resize();
	requestAnimationFrame(loop);
}

let stop = false;
const loop = () => {
	if(stop) {
		return;
	}
	gl.imageSmoothingEnabled = false;
	update();
	draw();

	requestAnimationFrame(loop);
}

let t = 0;
let target = 1000 / 60;
let then = performance.now();
let delta = 1;

const update = () => {
	delta = Math.max(performance.now() - then, 5) / target;

	t += 0.04 * delta;

	velocity.x *= 0.9;
	velocity.y *= 0.9;
	velocity.z *= 0.9;

	then = performance.now();
}

const velocity = {
	x: 0,
	y: 0,
	z: 0
}

const camera_pos = {
	x: -270.5131952323651,
	y: 17.515709387513418,
	z: 47.81027154421636
}

const camera_dir = {
	pitch: -6.259999999999964,
	yaw: -11.919999999999945,
	roll: 0
}

let focus = true;
const zero = glMatrix.vec3.fromValues(0, 0, 0);

const create_global_vector = (x, y, z, x0, y0, z0, name) => {
	const dir = vec3.fromValues(x, y, z);
	vec3.rotateX(dir, dir, zero, x0);
	vec3.rotateY(dir, dir, zero, y0);
	vec3.rotateZ(dir, dir, zero, z0);
	window[name] = {
		x: dir[0],
		y: dir[1],
		z: dir[2],
	}
}

const draw = () => {
	if(!focus) {
		return;
	}

	create_global_vector(0, 0, -1, camera_dir.pitch, -camera_dir.yaw, camera_dir.roll, "forward");
	create_global_vector(0, 0, -1, 0, -camera_dir.yaw, camera_dir.roll, "forward_xz");
	create_global_vector(-1, 0, 0, camera_dir.pitch, -camera_dir.yaw, camera_dir.roll, "right");
	create_global_vector(-1, 0, 0, 0, -camera_dir.yaw, camera_dir.roll, "right_xz");

	if(keys_down[87]) {
		velocity.x += forward_xz.x * 0.2;
		velocity.y += -forward.y * 0.2;
		velocity.z += forward_xz.z * 0.2;
	}
	if(keys_down[83]) {
		velocity.x += -forward_xz.x * 0.2;
		velocity.y += forward.y * 0.2;
		velocity.z += -forward_xz.z * 0.2;
	}
	if(keys_down[65]) {
		velocity.x += -right_xz.x * 0.2;
		velocity.z += -right_xz.z * 0.2;
	}
	if(keys_down[68]) {
		velocity.x += right_xz.x * 0.2;
		velocity.z += right_xz.z * 0.2;
	}
	if(keys_down[81]) {
		camera_dir.roll += 0.05;
	}
	if(keys_down[69]) {
		camera_dir.roll -= 0.05;
	}

	camera_pos.x += velocity.x;
	camera_pos.y += velocity.y;
	camera_pos.z += velocity.z;

	lib3d.clear();

	lib3d.primitives.RAY_MARCH_DEMO.draw(-1, -1, 2, 2, camera_pos, camera_dir);
}

const resize = () => {
	canvas.width = window.innerWidth/2;
	canvas.height = window.innerHeight/2;
	lib3d.resize();
}

setInterval(update, 1000 / 60);

window.addEventListener("load", start);
window.addEventListener("resize", resize);

keys_down = {}

window.onkeydown = (e) => {
	keys_down[e.keyCode] = true;

	if(e.keyCode == 80) {
		console.log(camera_pos);
	}
}

window.onkeyup = (e) => {
	keys_down[e.keyCode] = false;
}

let mouse_down = false;

window.onmousedown = () => {
	mouse_down = true;
	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
	canvas.requestPointerLock();
}

window.onmouseup = () => {
	mouse_down = false;
}

window.onmousemove = (e) => {
	if(document.pointerLockElement != canvas) {
		return;
	}
	camera_dir.yaw += -e.movementX / 100;
	camera_dir.pitch += e.movementY / 100;
}

let last_touch_pos = {
	x: -1,
	y: -1
}

window.ontouchmove = (e) => {
	e.preventDefault();
	if(last_touch_pos.x == -1 && last_touch_pos.y == -1) {
		last_touch_pos.x = e.changedTouches[0].screenY;
		last_touch_pos.y = e.changedTouches[0].screenX;
		return;
	}
	camera_dir.yaw += (last_touch_pos.y - e.changedTouches[0].screenX) / -100;
	camera_dir.pitch += (last_touch_pos.x - e.changedTouches[0].screenY) / 100;
	last_touch_pos.x = e.changedTouches[0].screenY;
	last_touch_pos.y = e.changedTouches[0].screenX;
}

window.ontouchend = (e) => {
	last_touch_pos = {
		x: -1,
		y: -1
	}
}

window.onmousewheel = (e) => {
	camera_pos.z += 0.1 * e.deltaY;
}

window.onblur = () => {
	focus = false;
}

window.onfocus = () => {
	focus = true;
}