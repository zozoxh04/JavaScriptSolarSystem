export const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPositionW;
varying vec3 vSunDirectionW;
varying float vSunfade;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;

uniform vec3 sunPosition;
uniform float rayleigh;
uniform float turbidity;
uniform float mieCoefficient;

const vec3 up = vec3(0.0, 1.0, 0.0);

// Constants for atmospheric scattering
const float e = 2.71828182845904523536028747135266249775724709369995957;
const float pi = 3.141592653589793238462643383279502884197169;
const float n = 1.0003; // refractive index of air
const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)
const float pn = 0.035; // depolatization factor for standard air

// Wavelengths of used primaries, according to preetham
const vec3 lambda = vec3(680E-9, 550E-9, 450E-9);

// Mie stuff
// K coefficient for the primaries
const vec3 K = vec3(0.686, 0.678, 0.666);
const float v = 4.0;

// Optical length at zenith for molecules
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const vec3 primaries = vec3(6.8E-7, 5.5E-7, 4.5E-7);

const float cutoffAngle = 1.6110731556870734;
const float steepness = 1.5;

vec3 totalRayleigh(vec3 lambda) {
    return (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn));
}

vec3 simplifiedRayleigh() {
    return 0.0005 / vec3(94, 40, 18);
}

float rayleighPhase(float cosTheta) {
    return (3.0 / (16.0 * pi)) * (1.0 + pow(cosTheta, 2.0));
}

vec3 totalMie(vec3 lambda, vec3 K, float T) {
    float c = (0.2 * T) * 10E-18;
    return 0.434 * c * pi * pow((2.0 * pi) / lambda, vec3(v - 2.0)) * K;
}

float hgPhase(float cosTheta, float g) {
    return (1.0 / (4.0 * pi)) * ((1.0 - pow(g, 2.0)) / pow(1.0 - 2.0 * g * cosTheta + pow(g, 2.0), 1.5));
}

float sunIntensity(float zenithAngleCos) {
    return max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zenithAngleCos)) / steepness)));
}

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPositionW = worldPosition.xyz;
    vNormal = normalize(normalMatrix * normal);
    vSunDirectionW = normalize(sunPosition);
    
    float sunfade = 1.0 - clamp(1.0 - exp((sunPosition.y / 450000.0)), 0.0, 1.0);
    vSunfade = sunfade;
    
    float rayleighCoefficient = rayleigh - (1.0 * (1.0 - sunfade));
    vBetaR = simplifiedRayleigh() * rayleighCoefficient;
    vBetaM = totalMie(lambda, K, turbidity) * mieCoefficient;
    
    float zenithAngle = acos(max(0.0, dot(up, vSunDirectionW)));
    float sR = rayleighZenithLength / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
    float sM = mieZenithLength / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
    
    vSunE = sunIntensity(dot(vSunDirectionW, up));
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragmentShader = `
varying vec3 vNormal;
varying vec3 vPositionW;
varying vec3 vSunDirectionW;
varying float vSunfade;
varying vec3 vBetaR;
varying vec3 vBetaM;
varying float vSunE;

uniform float mieDirectionalG;
uniform vec3 up;

// Planet-specific atmosphere properties
uniform vec3 planetColor;
uniform float atmosphereDensity;

const vec3 cameraPos = vec3(0.0, 0.0, 0.0);

// Constants for atmospheric scattering
const float pi = 3.141592653589793238462643383279502884197169;
const float n = 1.0003; // refractive index of air
const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

// Optical length at zenith for molecules
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;
const vec3 primaries = vec3(6.8E-7, 5.5E-7, 4.5E-7);

// 66 arc seconds -> degrees, and the cosine of that
const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

// 3.0 / (16.0 * pi)
const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
// 1.0 / (4.0 * pi)
const float ONE_OVER_FOURPI = 0.07957747154594767;

float rayleighPhase(float cosTheta) {
    return THREE_OVER_SIXTEENPI * (1.0 + pow(cosTheta, 2.0));
}

float hgPhase(float cosTheta, float g) {
    float g2 = pow(g, 2.0);
    float inverse = 1.0 / pow(1.0 - 2.0 * g * cosTheta + g2, 1.5);
    return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
}

void main() {
    vec3 direction = normalize(vPositionW - cameraPos);
    
    // Optical length
    // Cutoff angle at 90 to avoid singularity in next formula.
    float zenithAngle = acos(max(0.0, dot(up, direction)));
    float inverse = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));
    float sR = rayleighZenithLength * inverse;
    float sM = mieZenithLength * inverse;
    
    // Combined extinction factor
    vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));
    
    // In-scattering
    float cosTheta = dot(direction, vSunDirectionW);
    float rPhase = rayleighPhase(cosTheta * 0.5 + 0.5);
    vec3 betaRTheta = vBetaR * rPhase;
    float mPhase = hgPhase(cosTheta, mieDirectionalG);
    vec3 betaMTheta = vBetaM * mPhase;
    
    vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(2.0)); // Brighter scattering
    Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(1.0 / 2.0)), clamp(pow(1.0 - dot(up, vSunDirectionW), 5.0), 0.0, 1.0));
    
    // Nightsky
    vec3 direction_1 = direction * (float(gl_FrontFacing) * 2.0 - 1.0);
    float theta = acos(direction_1.y); // elevation --> y-axis, [-pi/2, pi/2]
    float phi = atan(direction_1.z, direction_1.x); // azimuth --> x-axis [-pi/2, pi/2]
    vec2 uv = vec2(phi, theta) / vec2(2.0 * pi, pi) + vec2(0.5, 0.0);
    
    vec3 L0 = vec3(0.1) * Fex;
    
    // Composition + solar disc
    float sundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta);
    L0 += (vSunE * 30000.0 * Fex) * sundisk;
    
    // Apply planet-specific atmosphere properties
    vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
    texColor *= planetColor;
    texColor *= atmosphereDensity;
    
    vec3 retColor = pow(texColor, vec3(1.0 / (1.1 + (1.1 * vSunfade)))); // Slightly brighter final color
    
    gl_FragColor = vec4(retColor, 1.0);
}
`;