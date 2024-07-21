precision mediump float;

attribute vec3 pos;
uniform mat4 m_world;
uniform mat4 m_view;
uniform mat4 m_proj;

varying lowp vec4 v_color;

void main(void) {
	gl_Position = m_proj * m_view * m_world * vec4(pos, 1);
	v_color = vec4(pos, 1);
}