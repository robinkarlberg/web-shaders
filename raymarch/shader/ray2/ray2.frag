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

const int MAX_LOOP = 100;
const float MAX_DIST = 500.0;
const float THRESHOLD = 0.1;

vec3 PRIM_LIGHT_DIR;
vec3 LIGHT_POS0;
vec3 LIGHT_POS1;

float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
	vec2 ip = floor(p);
	vec2 u = fract(p);
	u = u*u*(3.0-2.0*u);
	
	float res = mix(
		mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
		mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	return res*res;
}

struct Ray {
	bool hit;
	int hit_id;
	vec3 hit_pos;
	vec3 normal;
	float dist;
	float min_dist;
	vec3 color;
};

struct SDF {
	int id;
	float dist;
	vec3 color;
	vec3 normal;
};

SDF SDFMax(SDF a, SDF b) {
	if(a.dist > b.dist) {
		return a;
	}
	return b;
}

SDF SDFMin(SDF a, SDF b) {
	if(a.dist < b.dist) {
		return a;
	}
	return b;
}

float terrain(vec3 pos) {
	pos += vec3(noise(pos.xz * 0.14 + vec2(1.8, 4.6)), 0, noise(pos.xz * 0.1 - 0.5)) * 3.;
	return (noise(pos.xz * 0.005) - 0.5) * 20.;
}

float water(vec3 pos) {
	pos += vec3(noise(pos.xz * 0.14), 0, noise(pos.xz * 0.1 - 0.5 + vec2(t * 0.14, -t*0.1))) * 6.;
	return noise(pos.xz * 0.04 - vec2(t * 0.3 - 0.5, t*0.7 + 0.3)) * 3. + noise(pos.xz * 0.1 - vec2(t, t*0.2)) * 2.3 + noise(pos.xz * 0.2 + vec2(t * 0.2, t*0.1)) * 0.5 + noise(pos.xz * 0.4 - vec2(t * -0.1 - 0.3, -t*0.3)) * 0.3;
}

SDF SDFTerrain(vec3 pos) {
	return SDF(0, -pos.y + terrain(pos), vec3(0.7, 0.7, 0.7), vec3(0));
}

SDF SDFWater(vec3 pos) {
	return SDF(1, -pos.y + water(pos), vec3(0.7, 0.7, 0.7), vec3(0));
}

SDF SDFSphere(float r, vec3 pos, vec3 color) {
	return SDF(2, length(pos) - r, color, vec3(0));
}

SDF SDFSphere(float r, vec3 pos) {
	return SDFSphere(r, pos, vec3(1));
}

SDF SDFBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return SDF(3, length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0), vec3(1, 1, 1), vec3(0));
}

SDF SDFRoundBox( vec3 p, vec3 b, float r )
{
  vec3 d = abs(p) - b;
  return SDF(4, length(max(d,0.0)) - r + min(max(d.x,max(d.y,d.z)),0.0), vec3(1, 1, 1), vec3(0));
}

SDF SDFDistMul(SDF sdf, float c)
{
	sdf.dist *= c;
	return sdf;
}

SDF SDFScene(vec3 pos) {
	SDF sdf = SDFWater(pos);
	sdf = SDFMin(SDFTerrain(pos), sdf);
	sdf = SDFMin(SDFSphere(5.0, pos - vec3(0, -8, 0), vec3(0, 1, 1)), sdf);
	sdf = SDFMin(SDFSphere(20.0, pos - vec3(220, -8, 10), vec3(1, 0, 1)), sdf);
	sdf = SDFMin(SDFRoundBox(pos - vec3(100, -30, 5), vec3(60, 30, 20), 0.2), sdf);
	sdf = SDFMax(SDFDistMul(SDFBox(pos - vec3(100, -30, 5), vec3(61, 28, 18)), -1.), sdf);
	return sdf;
}

float DistScene(vec3 pos) {
	return SDFScene(pos).dist;
}

vec3 getNormal(vec3 pos) {
	return normalize(vec3(
		DistScene(vec3(pos.x + THRESHOLD, pos.y, pos.z)) - DistScene(vec3(pos.x - THRESHOLD, pos.y, pos.z)),
        DistScene(vec3(pos.x, pos.y + THRESHOLD, pos.z)) - DistScene(vec3(pos.x, pos.y - THRESHOLD, pos.z)),
        DistScene(vec3(pos.x, pos.y, pos.z  + THRESHOLD)) - DistScene(vec3(pos.x, pos.y, pos.z - THRESHOLD))
	));
}

SDF SDFSceneNormal(vec3 pos) {
	SDF sdf = SDFScene(pos);
	sdf.normal = getNormal(pos);
	return sdf;
}

Ray cast_ray(vec3 start_pos, vec3 dir, float max_dist) {
	float dist = 0.0;
	vec3 pos = start_pos + dir * 2.;
	float min_dist = 10000000.0;
	for(int i = 0; i < MAX_LOOP; i++) {
		SDF hit_sdf = SDFScene(pos);
		float sdf_dist = hit_sdf.dist;
		vec3 _dir = dir;
		if(pos.y > -60. && pos.y < 0.
			&& pos.x > 40. && pos.x < 160.
			&& pos.z > 5. - 20. && pos.z < 5. + 20.) {

			float hack = -1.;
			if(dir.x > 0.) {
				hack = 1.;
			}
			_dir = normalize(dir - vec3(hack, 0, 0) * 0.6);
		}

		pos += _dir * sdf_dist;
		dist += sdf_dist;
		if(sdf_dist < min_dist) {
			min_dist = sdf_dist;
		}
		if(sdf_dist < THRESHOLD) {
			hit_sdf.normal = getNormal(pos);
			if(hit_sdf.id == 0) {	//terrain
				hit_sdf.color = smoothstep(0.6, 1., -hit_sdf.normal.y) * vec3(0.1, 0.3, 0) + smoothstep(0.7, 0.8, -hit_sdf.normal.y) * vec3(0.6, 0.4, 0.2) + smoothstep(0.0, 0.8, -hit_sdf.normal.y) * vec3(0.6, 0.4, 0.4);
			}
			min_dist = 0.0;
			return Ray(true, hit_sdf.id, pos, hit_sdf.normal, dist, min_dist, hit_sdf.color);
		}
		if(dist > max_dist) {
			dist = max_dist;
			break;
		}
	}
	return Ray(false, -1, pos, -dir, dist, min_dist, vec3(1));
}

Ray cast_ray(vec3 start_pos, vec3 dir) {
	return cast_ray(start_pos, dir, MAX_DIST);
}

vec3 cast_rays(vec3 start_pos, vec3 dir) {
	Ray ray = cast_ray(start_pos, dir);
	vec3 fog_color = vec3(0.09, 0.1, 0.15);
	vec3 light = vec3(0);
	for(int i = 0; i < 6; i++) {
		if(ray.hit_id == 1 || ray.hit_id == 2) {		//water or sphere
			dir = reflect(dir, ray.normal);
			ray = cast_ray(ray.hit_pos, dir);
		}
	}
	if(ray.hit) {
		Ray sdw_ray0 = cast_ray(ray.hit_pos, -PRIM_LIGHT_DIR);
		if(!sdw_ray0.hit) {
			light += vec3(0.9, 0.9, 0.87) * 0.9;
		}
		else{
			light += vec3(0.1, 0.1, 0.2);
		}
		light *= dot(ray.normal, -PRIM_LIGHT_DIR);
		float dist_fog = min(max(length(ray.hit_pos + camera_pos), 0.) * 0.009, 10.);
		light += fog_color * dist_fog;
		light -= vec3(length(fog_color)) * 0.5 * dist_fog;
	}
	else {
		ray.color = fog_color * min((7. - log(ray.normal.y)), 1000.);
		// ray.color += smoothstep(0.5, 1., noise(normalize(vec2(0.6) + ray.normal.xz) * (ray.normal.y - sin(t * 0.005) + (noise(ray.normal.xz * 40. + vec2(t * 0.2)) - 0.5) * 0.02) * 70.));
		light = vec3(1);
	}
	return ray.color * light;
}

void main(void) {
	PRIM_LIGHT_DIR = normalize(vec3(0.2, 1, 0.6));
	LIGHT_POS0 = vec3(sin(t) * 50.0, -30, sin(t + 0.5) * 50.0);
	LIGHT_POS1 = vec3(cos(t / 1.3) * 10.0, -16, 3);

	vec2 screen_pos = -1.0 + 2.0 * gl_FragCoord.xy / screen_size.xy;
	screen_pos.x *= screen_size.x / screen_size.y;
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

	vec3 color = cast_rays(pos - camera_pos, pos_dir);
	gl_FragColor = vec4(color, 1);
	// gl_FragColor = vec4(dither8x8(gl_FragCoord.xy, color), 1);
}