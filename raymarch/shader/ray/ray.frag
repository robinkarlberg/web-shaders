//#version 140

#ifdef GL_FRAGMENT_PRECISION_HIGH
	precision highp float;
#else
	precision mediump float;
#endif

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float luma(vec4 color) {
  return dot(color.rgb, vec3(0.299, 0.587, 0.114));
}

float dither8x8(vec2 position, float brightness) {
  int x = int(mod(position.x, 8.0));
  int y = int(mod(position.y, 8.0));
  int index = x + y * 8;
  float limit = 0.0;

  if (x < 8) {
    if (index == 0) limit = 0.015625;
    if (index == 1) limit = 0.515625;
    if (index == 2) limit = 0.140625;
    if (index == 3) limit = 0.640625;
    if (index == 4) limit = 0.046875;
    if (index == 5) limit = 0.546875;
    if (index == 6) limit = 0.171875;
    if (index == 7) limit = 0.671875;
    if (index == 8) limit = 0.765625;
    if (index == 9) limit = 0.265625;
    if (index == 10) limit = 0.890625;
    if (index == 11) limit = 0.390625;
    if (index == 12) limit = 0.796875;
    if (index == 13) limit = 0.296875;
    if (index == 14) limit = 0.921875;
    if (index == 15) limit = 0.421875;
    if (index == 16) limit = 0.203125;
    if (index == 17) limit = 0.703125;
    if (index == 18) limit = 0.078125;
    if (index == 19) limit = 0.578125;
    if (index == 20) limit = 0.234375;
    if (index == 21) limit = 0.734375;
    if (index == 22) limit = 0.109375;
    if (index == 23) limit = 0.609375;
    if (index == 24) limit = 0.953125;
    if (index == 25) limit = 0.453125;
    if (index == 26) limit = 0.828125;
    if (index == 27) limit = 0.328125;
    if (index == 28) limit = 0.984375;
    if (index == 29) limit = 0.484375;
    if (index == 30) limit = 0.859375;
    if (index == 31) limit = 0.359375;
    if (index == 32) limit = 0.0625;
    if (index == 33) limit = 0.5625;
    if (index == 34) limit = 0.1875;
    if (index == 35) limit = 0.6875;
    if (index == 36) limit = 0.03125;
    if (index == 37) limit = 0.53125;
    if (index == 38) limit = 0.15625;
    if (index == 39) limit = 0.65625;
    if (index == 40) limit = 0.8125;
    if (index == 41) limit = 0.3125;
    if (index == 42) limit = 0.9375;
    if (index == 43) limit = 0.4375;
    if (index == 44) limit = 0.78125;
    if (index == 45) limit = 0.28125;
    if (index == 46) limit = 0.90625;
    if (index == 47) limit = 0.40625;
    if (index == 48) limit = 0.25;
    if (index == 49) limit = 0.75;
    if (index == 50) limit = 0.125;
    if (index == 51) limit = 0.625;
    if (index == 52) limit = 0.21875;
    if (index == 53) limit = 0.71875;
    if (index == 54) limit = 0.09375;
    if (index == 55) limit = 0.59375;
    if (index == 56) limit = 1.0;
    if (index == 57) limit = 0.5;
    if (index == 58) limit = 0.875;
    if (index == 59) limit = 0.375;
    if (index == 60) limit = 0.96875;
    if (index == 61) limit = 0.46875;
    if (index == 62) limit = 0.84375;
    if (index == 63) limit = 0.34375;
  }

  return brightness < limit ? 0.0 : 1.0;
}

vec3 dither8x8(vec2 position, vec3 color) {
  return color * dither8x8(position, luma(color));
}

vec4 dither8x8(vec2 position, vec4 color) {
  return vec4(color.rgb * dither8x8(position, luma(color)), 1.0);
}

uniform vec3 camera_pos;
uniform vec3 camera_dir;
uniform vec2 screen_size;
uniform float t;

struct RayData {
	vec3 color;
	bool hit;
	vec3 hit_pos;
	int depth;
	float closest_dist;
	float traveled_dist;
	float res;
};

struct SDFData {
	vec3 color;
	float dist;
};

float rand(vec2 p){
	return fract(sin(dot(p.xy, vec2(12.9898,78.233))) * 43758.5453);
}

SDFData sphere(vec3 p, vec3 center, float radius) {
	return SDFData(vec3(1, 0.5, 1), length(p - center) - radius);
}

SDFData box(vec3 p, vec3 center, vec3 size, float m) {
	vec3 color;
	if(mod(p.x, 20.0) <= 10.0) {
		if(mod(p.z, 20.0) <= 10.0) {
			color = vec3(0.75);
		}
		else {
			color = vec3(1);
		}
	}
	else {
		if(mod(p.z, 20.0) <= 10.0) {
			color = vec3(1);
		}
		else {
			color = vec3(0.75);
		}
	}
	color = vec3(1);
	vec3 o = abs(p - center) - size;
	float ud = length(max(o, 0.0));
	float n = max(max(min(o.x, 0.0), min(o.y, 0.0)), min(o.z, 0.0));
	return SDFData(color, (ud+n) * m);
}

SDFData ground(vec3 p, float height) {
	vec3 color;
	float box_size = 50.0;
	float mod_threshold = 25.0 * 2.0;
	if(mod(p.x, box_size * 2.0) <= mod_threshold) {
		if(mod(p.z, box_size * 2.0) <= mod_threshold) {
			color = vec3(0.1);
		}
		else {
			color = vec3(1, 0.25, 0.7);
		}
	}
	else {
		if(mod(p.z, box_size * 2.0) <= mod_threshold) {
			color = vec3(1, 0.25, 0.7);
		}
		else {
			color = vec3(0.1);
		}
	}
	return SDFData(color, height - p.y);
}

SDFData cool(vec3 p, vec3 center, float radius) {
	return SDFData(normalize(vec3(mod(p, 200.0) / 20.0)) * 1.5, length(mod(p, (100.0 + sin(t) * 20.0) * 2.0) - center) - radius);
}

vec3 light_dir() {
	// return normalize(vec3(sin(t), cos(t * 0.5 + 0.4), cos(t)));
	return normalize(vec3(sin(t / 3.0) / 4.0 - 0.3, 0.5, 0.3));
}

SDFData SDFMin(SDFData s0, SDFData s1) {
	if(s0.dist < s1.dist) {
		return s0;
	}
	else {
		return s1;
	}
}

SDFData SDFMax(SDFData s0, SDFData s1) {
	if(s0.dist > s1.dist) {
		return s0;
	}
	else {
		return s1;
	}
}

vec3 start(vec3 start, vec3 dir);
RayData ray(vec3 start, vec3 dir, float max_dist);

void main(void) {
	vec2 screen_pos = -1.0 + 2.0 * gl_FragCoord.xy / screen_size.xy; // screenPos can range from -1 to 1
	screen_pos.x *= screen_size.x / screen_size.y; // Correct aspect ratio
	screen_pos.y *= -1.0;

	vec3 theta = camera_dir;

	mat3 rotx;
	rotx[0] = vec3(1, 0, 0);
	rotx[1] = vec3(0, cos(theta.x), sin(theta.x));
	rotx[2] = vec3(0, -sin(theta.x), cos(theta.x));

	mat3 roty;
	roty[0] = vec3(cos(theta.y), 0, -sin(theta.y));
	roty[1] = vec3(0, 1, 0);
	roty[2] = vec3(sin(theta.y), 0, cos(theta.y));

	mat3 rotz;
	rotz[0] = vec3(cos(theta.z), sin(theta.z), 0);
	rotz[1] = vec3(-sin(theta.z), cos(theta.z), 0);
	rotz[2] = vec3(0, 0, 1);

	vec3 pos = vec3(screen_pos, 1);

	pos *= rotx * roty * rotz;

	vec3 pos_dir = normalize(pos);

	vec3 color = start(pos - camera_pos, pos_dir);

	// gl_FragColor = vec4(color, 1);
	gl_FragColor = vec4(color * dither8x8(gl_FragCoord.xy, color), 1);
}

vec3 start(vec3 start, vec3 dir) {
	RayData vis_ray = ray(start, dir, 3000.0);
	vec3 m_sdw = vec3(1, 1, 1);
	float m_ocl = 1.0;
	vec3 m_glw = vec3(0.0);
	if(vis_ray.hit) {
		RayData sdw_ray = ray(vis_ray.hit_pos, /*-light_dir()*/ -normalize(vis_ray.hit_pos + vec3(0, 0, 0)), length(vis_ray.hit_pos + vec3(0, 0, 0))/* , 696969.0*/);
		if(sdw_ray.hit) {
			m_sdw = vec3(1, 1, 1) * 0.05;
			m_ocl = max(min(1.0 / (max(float(vis_ray.depth) - 10.0, 0.0) / 5.0), 1.0), 0.0);
		}
		else {
			m_sdw = max(vec3(1, 0.95, 0.85) * sdw_ray.res, vec3(0.2, 0.2, 0.2));
			// m_sdw = max(vec3(1, 0.95, 0.85) * 1.0, vec3(0.2, 0.2, 0.2));
			m_ocl = max(min(sdw_ray.closest_dist * 1.5, 1.0), 0.0);
		}
		// m_sdw = vec3(1);
	}
	else {
		float _closest_dist = vis_ray.closest_dist + 0.9;
		m_glw = vec3(0.03 / _closest_dist, 0.04 / _closest_dist, 0.04 / _closest_dist) * 10.0;
	}
	return vis_ray.color * m_sdw * m_ocl/* + m_glw*/;
}

RayData ray(vec3 start, vec3 dir, float max_dist) {
	vec3 pos = start + dir;
	vec3 pre_pos = pos;

	float min_dist = 696969.0;
	float travel_dist = 0.0;
	float dist = 0.0;

	float res = 1.0;
	float k = 4.0;
	float last_dist = 1e20;

	for(int i = 0; i < 400; i++) {

		if(travel_dist > max_dist) {
			break;
		}

		SDFData s =
		SDFMin(ground(pos, 100.0), SDFMax(box(pos, vec3(0, 0, 0), vec3(600, 300, 600), 1.0), box(pos, vec3(0, 0, 0), vec3(590, 210, 590), -1.0)));
		// SDFMin(, box(pos, vec3(20, 20, 20), vec3(20, 20, 20), 1.0)));

		dist = s.dist;

		// float box_dist = box(pos, vec3(-505.0, -35.0, -500.0), vec3(310.0, 140.0, 140.0), 1.0).dist;
		// if (box_dist < -5.0) {
		// 	pos.x -= dir.x * dist * (sin(t) + 1.0) * 0.34;
		// }

		if(dist < min_dist) {
			min_dist = dist;
		}

		float y = dist * dist / (2.0 * last_dist);
		float d = sqrt(dist * dist - y * y);
		res = min(res, k * d / max(0.0, travel_dist - y));
		// res = min(res, k *  / travel_dist)

		if(dist < 0.01) {
			return RayData(vec3(s.color), true, pos + dir * dist, i, min_dist, length((pos + dir * dist) - start), res);
		}
		
		travel_dist += dist;
		last_dist = dist;

		pre_pos = pos;
		pos += dir * dist;
	}
	return RayData(vec3(0), false, pos + dir * dist, 199, min_dist, length(pos - start), res);
}