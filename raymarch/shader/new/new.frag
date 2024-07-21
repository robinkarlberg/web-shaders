#ifdef GL_FRAGMENT_PRECISION_HIGH
	precision highp float;
#else
	precision mediump float;
#endif

uniform vec3 camera_pos;
uniform vec3 camera_dir;
uniform vec2 screen_size;
uniform float t;

const int MAX_LOOP = 400;
const float MAX_DIST = 700.0;
const float THRESHOLD = 0.1;
const int MAX_REFLECT = 2;

vec3 PRIM_LIGHT_DIR;
vec3 LIGHT_POS0;
vec3 LIGHT_POS1;
vec3 LIGHT_POS2;

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
	int i;
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

// SDF SDFTerrain(vec3 pos) {
// 	return SDF(1, -pos.y, vec3(0.7, 0.7, 0.7), vec3(0));
// }

float NOISE_TERRAIN_POS_SCALE = 5.;
float NOISE_TERRAIN_HEIGHT_SCALE = 0.15;

SDF SDFTerrain(vec3 pos) {
	return SDF(1,
		(
			noise(pos.xz * NOISE_TERRAIN_POS_SCALE * 0.001 + vec2(5)) * 500. * NOISE_TERRAIN_HEIGHT_SCALE -
			noise(pos.xz * NOISE_TERRAIN_POS_SCALE * 0.01) * 50. * NOISE_TERRAIN_HEIGHT_SCALE -
			noise(pos.xz * NOISE_TERRAIN_POS_SCALE * 0.03) * 10. * NOISE_TERRAIN_HEIGHT_SCALE -
			noise(pos.xz * NOISE_TERRAIN_POS_SCALE * 0.05) * 5. * NOISE_TERRAIN_HEIGHT_SCALE
		) - pos.y + -0.,
	vec3(1., 1., 1.), vec3(0));
}

SDF SDFRoof(vec3 pos) {
	pos = vec3(pos.x + 100., pos.y, pos.z - 100.);
	return SDF(1,
		(
			noise(pos.xz * NOISE_TERRAIN_POS_SCALE * 0.0001 + vec2(5)) * 500. * NOISE_TERRAIN_HEIGHT_SCALE
		) + pos.y + 100.,
	vec3(1., 1., 1.), vec3(0));
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

SDF SDFBoxMirror( vec3 p, vec3 b )
{
	vec3 d = abs(p) - b;
	return SDF(5, length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0), vec3(1, 1, 1), vec3(0));
}

SDF SDFLight(float r, vec3 pos, vec3 color) {
	return SDF(99, length(pos) - r, color, vec3(0));
}

SDF SDFDistMul(SDF sdf, float c)
{
	sdf.dist *= c;
	return sdf;
}

SDF SDFScene(vec3 pos, int ignore) {
	SDF sdf = SDFTerrain(pos);
	sdf = SDFMin(SDFRoof(pos), sdf);
	sdf = SDFMin(SDFSphere(5.0, pos - vec3(0, -8, 0), vec3(0, 1, 1)), sdf);
	sdf = SDFMin(SDFSphere(20.0, pos - vec3(10, 0, -150), vec3(1, 1, 1)), sdf);
	sdf = SDFMin(SDFRoundBox(pos - vec3(100, -30, 5), vec3(60, 30, 20), 0.2), sdf);
	sdf = SDFMax(SDFDistMul(SDFBox(pos - vec3(100, -30, 5), vec3(61, 28, 18)), -1.), sdf);
	sdf = SDFMin(SDFBoxMirror(pos - vec3(0, -50, 100), vec3(50, 50, 5)), sdf);
	sdf = SDFMin(SDFBoxMirror(pos - vec3(0, -50, 100), vec3(5, 50, 50)), sdf);

	if(ignore != 99) {
		sdf = SDFMin(SDFLight(1.0, pos - LIGHT_POS0, vec3(15, 7, 0)), sdf);
		sdf = SDFMin(SDFLight(1.0, pos - LIGHT_POS1, vec3(0, 8, 15)), sdf);
		// sdf = SDFMin(SDFLight(1.0, pos - LIGHT_POS2, vec3(0, 0, 15)), sdf);
	}
	return sdf;
}

float DistScene(vec3 pos) {
	return SDFScene(pos, -1).dist;
}

vec3 getNormal(vec3 pos) {
	return normalize(vec3(
		DistScene(vec3(pos.x + THRESHOLD, pos.y, pos.z)) - DistScene(vec3(pos.x - THRESHOLD, pos.y, pos.z)),
		DistScene(vec3(pos.x, pos.y + THRESHOLD, pos.z)) - DistScene(vec3(pos.x, pos.y - THRESHOLD, pos.z)),
		DistScene(vec3(pos.x, pos.y, pos.z  + THRESHOLD)) - DistScene(vec3(pos.x, pos.y, pos.z - THRESHOLD))
	));
}

// Very laggy to use this, better to only calculate normal when something is actually hit
SDF SDFSceneNormal(vec3 pos, int ignore) {
	SDF sdf = SDFScene(pos, ignore);
	sdf.normal = getNormal(pos);
	return sdf;
}

Ray _cast_ray(vec3 start_pos, vec3 dir, float max_dist, int ignore) {
	float dist = 0.0;
	vec3 pos = start_pos + dir * 1.;
	float min_dist = 10000000.0;
	SDF min_dist_sdf;
	int loop = 0;
	for(int i = 0; i < MAX_LOOP; i++) {
		SDF hit_sdf = SDFScene(pos, ignore);
		float sdf_dist = hit_sdf.dist;
		pos += dir * sdf_dist;
		dist += sdf_dist;
		
		if(sdf_dist < min_dist) {
			min_dist = sdf_dist;
			min_dist_sdf = hit_sdf;
		}
		if(sdf_dist < THRESHOLD) {
			min_dist = 0.0;
			hit_sdf.normal = getNormal(pos);
			return Ray(true, hit_sdf.id, pos, hit_sdf.normal, dist, min_dist, hit_sdf.color, loop);
		}
		if(dist > max_dist) {
			dist = max_dist;
			break;
		}
		loop = i;
	}
	if(dist < max_dist && min_dist_sdf.id > 0) {
		min_dist_sdf.normal = getNormal(pos);
		return Ray(true, min_dist_sdf.id, pos, min_dist_sdf.normal, dist, min_dist, min_dist_sdf.color, loop);
	}
	return Ray(false, -1, pos, -dir, dist, min_dist, vec3(1), loop);
}

float shadow(vec3 start_pos, vec3 dir, float max_dist, int ignore) {
	float dist = 0.0;
	vec3 pos = start_pos + dir * 1.;
	float min_dist = 10000000.0;
	SDF min_dist_sdf;
	int loop = 0;

	float light = 1.0;
	float t = 0.0;
	for(int i = 0; i < MAX_LOOP; i++) {
		SDF hit_sdf = SDFScene(pos, ignore);
		float sdf_dist = hit_sdf.dist;
		pos += dir * sdf_dist;
		dist += sdf_dist;
		
		if(sdf_dist < min_dist) {
			min_dist = sdf_dist;
			min_dist_sdf = hit_sdf;
		}
		if(sdf_dist < THRESHOLD) {
			min_dist = 0.0;
			hit_sdf.normal = getNormal(pos);
			return 0.0;
		}
		if(dist > max_dist) {
			dist = max_dist;
			break;
		}
		loop = i;
		light = min(light, 16.0 * min_dist/t);
		t += min_dist;
	}
	return light;
}

Ray cast_ray(vec3 start_pos, vec3 dir, float max_dist, int ignore) {
	Ray ray = _cast_ray(start_pos, dir, max_dist, ignore);
	for(int i = 0; i < MAX_REFLECT; i++) {
		if(ray.hit_id == 5) {	// if hit box mirror
			dir = reflect(dir, ray.normal);
			ray = _cast_ray(ray.hit_pos, dir, max_dist - ray.dist, ignore);
		}
		else {
			break;
		}
	}
	return ray;
}

Ray cast_ray(vec3 start_pos, vec3 dir) {
	return cast_ray(start_pos, dir, MAX_DIST, -1);
}

vec3 cast_rays(vec3 start_pos, vec3 dir) {
	Ray ray = cast_ray(start_pos, dir);
	float dots = 0.;

	vec3 light = vec3(0.05, 0.07, 0.1);
	vec3 light0 = vec3(0);
	vec3 light1 = vec3(0);
	vec3 light2 = vec3(0);

	if(ray.hit_id == 99) {
		light = vec3(1);
	}
	else if(ray.hit) {
		vec3 light_dir_0 = normalize(LIGHT_POS0 - ray.hit_pos);
		float light_dist_0 = length(LIGHT_POS0 - ray.hit_pos);
		// Ray sdw_ray0 = shadow(ray.hit_pos, light_dir_0, light_dist_0, 99);
		// if(!sdw_ray0.hit) {
		// 	light0 = vec3(1, 1, 1);
		// }
		// light0 *= dot(ray.normal, light_dir_0);
		float light0_intensity = shadow(ray.hit_pos, light_dir_0, light_dist_0, 99) * 0.3 / (light_dist_0 * 0.015);
		light0 = vec3(light0_intensity, light0_intensity * 0.5, 0) * dot(ray.normal, light_dir_0);

		vec3 light_dir_1 = normalize(LIGHT_POS1 - ray.hit_pos);
		float light_dist_1 = length(LIGHT_POS1 - ray.hit_pos);
		// Ray sdw_ray1 = cast_ray(ray.hit_pos, light_dir_1, light_dist_1, 99);
		// if(!sdw_ray1.hit) {
		// 	light1 += vec3(0, 0.5, 1);
		// }
		// light1 *= dot(ray.normal, light_dir_1);
		float light1_intensity = shadow(ray.hit_pos, light_dir_1, light_dist_1, 99) / (light_dist_1 * 0.015);
		light1 = vec3(light1_intensity * 0.3, light1_intensity * 0.7, light1_intensity) * dot(ray.normal, light_dir_1);

		// vec3 light_dir_2 = normalize(LIGHT_POS2 - ray.hit_pos);
		// float light_dist_2 = length(LIGHT_POS2 - ray.hit_pos);
		// Ray sdw_ray2 = cast_ray(ray.hit_pos, light_dir_2, light_dist_2, 99);
		// if(!sdw_ray2.hit) {
		// 	light2 += vec3(0, 0, 1);
		// }
		// light2 *= dot(ray.normal, light_dir_2);

		light += light0 + light1;// + light2;
		light += vec3(0.1);
	}
	else {
		light = vec3(0.1);
	}
	light -= float(ray.i) / float(MAX_LOOP);
	return ray.color * light;
}

void main(void) {
	LIGHT_POS0 = vec3(sin(t / 13.0) * 50.0, -50, cos(t / 11.7 + 0.5) * 50.0);
	LIGHT_POS1 = vec3(cos(t / 9.0) * 10.0, -20, sin(t / 8.0) * 50.);
	// LIGHT_POS2 = vec3(cos(t / 0.3) * 3.0, -40, sin(t / 3.3) * 20.0);

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