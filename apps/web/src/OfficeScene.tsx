import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei/core/Float";
import { Line } from "@react-three/drei/core/Line";
import { RoundedBox } from "@react-three/drei/core/RoundedBox";
import { Text } from "@react-three/drei/core/Text";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { gsap } from "gsap";
import * as THREE from "three";

type OfficeSceneProps = {
  signalScore: number;
  jobCount: number;
  applicationCount: number;
};

const red = "#ff2a2a";
const deepRed = "#501010";
const cyan = "#6be7ff";
const black = "#050506";

export function OfficeScene(props: OfficeSceneProps) {
  const compact = useCompactScene();

  return (
    <div className="office-webgl" aria-hidden="true">
      <Canvas
        camera={{ fov: 44, near: 0.1, far: 95, position: [0, 2.7, 12.2] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={["#020202"]} />
        <fog attach="fog" args={["#030405", 6.5, 28]} />
        <Suspense fallback={null}>
          <OfficeWorld {...props} compact={compact} />
          {!compact ? (
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.74} luminanceThreshold={0.18} luminanceSmoothing={0.72} mipmapBlur />
            </EffectComposer>
          ) : null}
        </Suspense>
      </Canvas>
    </div>
  );
}

function OfficeWorld({ signalScore, jobCount, applicationCount, compact }: OfficeSceneProps & { compact: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const reducedMotion = useReducedMotion();
  const floorTexture = useMemo(() => makeFloorTexture(), []);
  const wallTexture = useMemo(() => makeWallTexture(), []);
  const carpetTexture = useMemo(() => makeCarpetTexture(), []);
  const deskTexture = useMemo(() => makeDeskTexture(), []);
  const fabricTexture = useMemo(() => makeFabricTexture(), []);
  const cameraPath = useMemo(
    () => [
      { p: 0, camera: new THREE.Vector3(0, 2.9, 12.2), target: new THREE.Vector3(0, 0.72, -2.15) },
      { p: 0.18, camera: new THREE.Vector3(-5.85, 1.9, 3.95), target: new THREE.Vector3(-4.85, 0.38, -0.4) },
      { p: 0.34, camera: new THREE.Vector3(-3.3, 1.92, 4.0), target: new THREE.Vector3(-1.65, 0.38, -0.38) },
      { p: 0.5, camera: new THREE.Vector3(2.45, 1.92, 3.85), target: new THREE.Vector3(1.65, 0.38, -0.42) },
      { p: 0.66, camera: new THREE.Vector3(5.25, 2.0, 3.9), target: new THREE.Vector3(4.85, 0.38, -0.42) },
      { p: 0.83, camera: new THREE.Vector3(-2.2, 2.35, -1.65), target: new THREE.Vector3(-2.2, 2.42, -8.05) },
      { p: 1, camera: new THREE.Vector3(2.2, 2.35, -1.65), target: new THREE.Vector3(2.2, 2.42, -8.05) },
    ],
    [],
  );
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-7.2, -0.94, 3.45),
        new THREE.Vector3(-4.7, -0.42, 0.65),
        new THREE.Vector3(-1.3, -0.28, -2.65),
        new THREE.Vector3(2.2, -0.35, -3.45),
        new THREE.Vector3(5.8, -0.72, -0.72),
      ]),
    [],
  );
  const curvePoints = useMemo(() => curve.getPoints(170), [curve]);
  const particles = useMemo(() => {
    const particleCount = compact ? 220 : 700;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const point = curve.getPoint(index / particleCount);
      positions[index * 3] = point.x + (Math.random() - 0.5) * 5.8;
      positions[index * 3 + 1] = point.y + Math.random() * 3.2;
      positions[index * 3 + 2] = point.z + (Math.random() - 0.5) * 4.4;
    }
    return positions;
  }, [compact, curve]);

  useFrame(({ camera, pointer, clock }) => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = gsap.utils.clamp(0, 1, window.scrollY / maxScroll);
    const { camera: nextCamera, target } = interpolateCamera(cameraPath, progress);
    nextCamera.x += pointer.x * 0.32;
    nextCamera.y += pointer.y * -0.14;
    camera.position.lerp(nextCamera, reducedMotion ? 1 : 0.075);
    camera.lookAt(target);

    const elapsed = clock.getElapsedTime();
    if (rootRef.current && !reducedMotion) {
      rootRef.current.rotation.y = Math.sin(elapsed * 0.08) * 0.026;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = reducedMotion ? 0.36 : elapsed * 0.32;
    }
    if (particlesRef.current && !reducedMotion) {
      particlesRef.current.rotation.y = Math.sin(elapsed * 0.11) * 0.05;
    }
  });

  const nodeCount = Math.max(6, Math.min(16, jobCount + applicationCount + 5));

  return (
    <group ref={rootRef}>
      <ambientLight intensity={0.2} color="#9fb5c5" />
      <directionalLight position={[-5, 8, 7]} intensity={1.45} color="#b6e8ff" />
      {!compact ? <spotLight position={[0, 4.0, 3.6]} angle={0.62} penumbra={0.86} intensity={22} color="#ff4a3b" distance={15} /> : null}
      <pointLight position={[4.8, 2.4, -1.5]} intensity={28} distance={16} color={red} />
      <pointLight position={[-5.7, 3.0, -4.2]} intensity={15} distance={16} color={cyan} />

      <OfficeShell floorTexture={floorTexture} wallTexture={wallTexture} carpetTexture={carpetTexture} />
      {!compact ? <ShadowSystem /> : null}
      <CeilingSystem />
      <MeetingZone deskTexture={deskTexture} fabricTexture={fabricTexture} />
      <DeskCluster deskTexture={deskTexture} fabricTexture={fabricTexture} compact={compact} />
      <WallDashboard signalScore={signalScore} />
      <ResumeScanner />
      <PipelineWall />
      {!compact ? <ServerRack /> : null}
      {!compact ? <ExecutiveShelving /> : null}
      {!compact ? <OfficeMicroDetails /> : null}
      {!compact ? <CommandRoomDetails /> : null}
      {!compact ? <PlantCluster position={[-6.9, -0.52, -4.9]} /> : null}
      {!compact ? <PlantCluster position={[6.5, -0.52, -4.7]} /> : null}

      <Line points={curvePoints} color={red} lineWidth={1.1} transparent opacity={0.66} />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color={red} size={0.026} transparent opacity={0.38} depthWrite={false} />
      </points>
      <mesh ref={ringRef} position={[-4.75, 1.9, 0.85]} rotation={[1.32, 0.18, 0.34]}>
        <torusGeometry args={[0.95 + signalScore / 240, 0.013, 10, 142]} />
        <meshBasicMaterial color={red} transparent opacity={0.42} wireframe />
      </mesh>
      {Array.from({ length: compact ? Math.min(8, nodeCount) : nodeCount }).map((_, index) => {
        const point = curve.getPoint(index / nodeCount);
        return (
          <Float key={index} speed={1.15 + index * 0.03} floatIntensity={0.3} rotationIntensity={0.16}>
            <mesh position={[point.x, point.y + 0.68 + Math.sin(index) * 0.35, point.z]}>
              <sphereGeometry args={[0.06 + (index % 3) * 0.012, 18, 18]} />
              <meshStandardMaterial
                color={index % 3 === 0 ? cyan : red}
                emissive={index % 3 === 0 ? cyan : red}
                emissiveIntensity={1.32}
                roughness={0.28}
              />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

function OfficeShell({
  floorTexture,
  wallTexture,
  carpetTexture,
}: {
  floorTexture: THREE.Texture;
  wallTexture: THREE.Texture;
  carpetTexture: THREE.Texture;
}) {
  return (
    <group>
      <mesh position={[0, -1.08, -1.15]} receiveShadow>
        <boxGeometry args={[18, 0.08, 22]} />
        <meshStandardMaterial map={floorTexture} bumpMap={floorTexture} bumpScale={0.018} color="#121317" roughness={0.66} metalness={0.14} />
      </mesh>
      <mesh position={[0, -1.032, -1.32]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15.2, 17.4]} />
        <meshStandardMaterial map={carpetTexture} bumpMap={carpetTexture} bumpScale={0.026} color="#140708" roughness={0.9} metalness={0.04} />
      </mesh>
      <mesh position={[0, 4.22, -1.15]}>
        <boxGeometry args={[18, 0.08, 22]} />
        <meshStandardMaterial color="#050506" roughness={0.72} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.52, -8.35]}>
        <boxGeometry args={[18.2, 5.45, 0.18]} />
        <meshStandardMaterial map={wallTexture} bumpMap={wallTexture} bumpScale={0.018} color="#2a313a" roughness={0.64} metalness={0.22} emissive="#080c10" emissiveIntensity={0.34} />
      </mesh>
      <mesh position={[0, 1.1, -8.235]}>
        <boxGeometry args={[17.65, 3.15, 0.08]} />
        <meshStandardMaterial color="#242b33" roughness={0.54} metalness={0.32} emissive="#060a0d" emissiveIntensity={0.26} />
      </mesh>
      <mesh position={[0, 2.72, -8.18]}>
        <boxGeometry args={[17.75, 0.62, 0.09]} />
        <meshStandardMaterial color="#323943" roughness={0.46} metalness={0.36} emissive="#060a0d" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, -0.56, -8.15]}>
        <boxGeometry args={[17.7, 0.62, 0.12]} />
        <meshStandardMaterial color="#0c0d10" roughness={0.48} metalness={0.42} />
      </mesh>
      {[-8.22, 8.22].map((x) => (
        <mesh key={x} position={[x, 1.5, -1.15]}>
          <boxGeometry args={[0.08, 5.25, 22]} />
          <meshStandardMaterial map={wallTexture} bumpMap={wallTexture} bumpScale={0.012} color="#0e1115" roughness={0.76} metalness={0.2} />
        </mesh>
      ))}
      <SolidRoomEnvelope wallTexture={wallTexture} />
      {Array.from({ length: 9 }).map((_, index) => {
        const value = -4 + index;
        return (
          <group key={value}>
            <mesh position={[value * 2, 4.16, -1.15]}>
              <boxGeometry args={[0.016, 0.016, 22]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.22} />
            </mesh>
            <mesh position={[0, 4.17, -8 + value * 2]}>
              <boxGeometry args={[18, 0.016, 0.016]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.15} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -1.035, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 7.7, 160]} />
        <meshBasicMaterial color={deepRed} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <FloorInlays />
      <RoomSeams />
      <ClosedBackWall />
      <WallCladding />
      <ArchitecturalTrims />
      <OfficeBrandSign />
    </group>
  );
}

function SolidRoomEnvelope({ wallTexture }: { wallTexture: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, 1.55, -8.62]} receiveShadow>
        <boxGeometry args={[19.25, 5.88, 0.32]} />
        <meshStandardMaterial
          map={wallTexture}
          bumpMap={wallTexture}
          bumpScale={0.022}
          color="#26323c"
          roughness={0.68}
          metalness={0.18}
          emissive="#05090c"
          emissiveIntensity={0.18}
        />
      </mesh>
      {[-8.78, 8.78].map((x) => (
        <mesh key={x} position={[x, 1.45, -1.1]} receiveShadow>
          <boxGeometry args={[0.36, 5.7, 22.6]} />
          <meshStandardMaterial
            map={wallTexture}
            bumpMap={wallTexture}
            bumpScale={0.016}
            color="#151c23"
            roughness={0.74}
            metalness={0.18}
            emissive="#030607"
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}
      <mesh position={[0, -0.76, -8.36]} receiveShadow>
        <boxGeometry args={[18.5, 0.42, 0.44]} />
        <meshStandardMaterial color="#090a0c" roughness={0.5} metalness={0.46} />
      </mesh>
      <mesh position={[0, 3.96, -8.34]}>
        <boxGeometry args={[18.5, 0.28, 0.38]} />
        <meshStandardMaterial color="#111820" roughness={0.42} metalness={0.42} emissive="#020405" emissiveIntensity={0.14} />
      </mesh>
      {[-8.22, 8.22].map((x) => (
        <mesh key={`corner-${x}`} position={[x, 1.54, -8.2]}>
          <boxGeometry args={[0.38, 5.25, 0.5]} />
          <meshStandardMaterial color="#0b0d10" roughness={0.46} metalness={0.5} emissive="#020304" emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function ShadowSystem() {
  return (
    <group>
      <ShadowBlob position={[0, -0.997, -3.05]} scale={[4.8, 1.4, 1]} opacity={0.26} />
      {[-4.85, -1.65, 1.65, 4.85].map((x, index) => (
        <ShadowBlob key={x} position={[x, -0.996, 0.86]} scale={[1.75, 0.82, 1]} opacity={index % 2 ? 0.24 : 0.28} />
      ))}
      <ShadowBlob position={[6.9, -0.996, -1.35]} scale={[0.8, 1.25, 1]} opacity={0.3} />
      <ShadowBlob position={[0, -0.996, 3.25]} scale={[1.25, 0.55, 1]} opacity={0.24} />
      <ShadowBlob position={[-6.95, -0.996, -6.75]} scale={[1.2, 0.7, 1]} opacity={0.23} />
      <ShadowBlob position={[6.95, -0.996, -6.75]} scale={[1.2, 0.7, 1]} opacity={0.23} />
      <ShadowBlob position={[-7.15, -0.996, -0.15]} scale={[0.62, 0.48, 1]} opacity={0.24} />
      <ShadowBlob position={[-7.05, -0.996, 1.55]} scale={[0.72, 0.58, 1]} opacity={0.22} />
      <ShadowBlob position={[7.1, -0.996, 1.75]} scale={[1.2, 0.52, 1]} opacity={0.26} />
      <ShadowBlob position={[-1.8, -0.996, -5.9]} scale={[1.5, 0.5, 1]} opacity={0.22} />
      <ShadowBlob position={[1.8, -0.996, -5.9]} scale={[1.5, 0.5, 1]} opacity={0.22} />
    </group>
  );
}

function ShadowBlob({
  position,
  scale,
  opacity,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  opacity: number;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale}>
      <circleGeometry args={[1, 48]} />
      <meshBasicMaterial color="#000000" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function ArchitecturalTrims() {
  return (
    <group>
      <mesh position={[0, -0.62, -8.06]}>
        <boxGeometry args={[17.4, 0.18, 0.13]} />
        <meshStandardMaterial color="#090809" roughness={0.48} metalness={0.48} />
      </mesh>
      <mesh position={[0, 3.72, -8.06]}>
        <boxGeometry args={[17.4, 0.12, 0.13]} />
        <meshStandardMaterial color="#090809" roughness={0.42} metalness={0.54} />
      </mesh>
      {[-8.08, 8.08].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.62, -1.15]}>
            <boxGeometry args={[0.13, 0.18, 21.2]} />
            <meshStandardMaterial color="#090809" roughness={0.48} metalness={0.48} />
          </mesh>
          <mesh position={[x, 3.72, -1.15]}>
            <boxGeometry args={[0.13, 0.12, 21.2]} />
            <meshStandardMaterial color="#090809" roughness={0.42} metalness={0.54} />
          </mesh>
        </group>
      ))}
      {[-5.9, -2.95, 0, 2.95, 5.9].map((x, index) => (
        <group key={x} position={[x, 0.98, -8.0]}>
          <mesh>
            <boxGeometry args={[0.06, 3.2, 0.18]} />
            <meshStandardMaterial color="#070708" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.115]}>
            <boxGeometry args={[0.018, 2.88, 0.018]} />
            <meshBasicMaterial color={index % 2 ? cyan : red} transparent opacity={0.22} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FloorInlays() {
  return (
    <group>
      {Array.from({ length: 13 }).map((_, index) => (
        <mesh key={`floor-x-${index}`} position={[-7.2 + index * 1.2, -0.982, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.014, 17.2]} />
          <meshBasicMaterial color="#2d2021" transparent opacity={0.28} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: 15 }).map((_, index) => (
        <mesh key={`floor-z-${index}`} position={[0, -0.981, -8.8 + index * 1.2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <planeGeometry args={[0.014, 15.2]} />
          <meshBasicMaterial color="#261d20" transparent opacity={0.24} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Line
        points={[
          [-6.8, -0.92, 3.2],
          [-4.2, -0.9, 0.55],
          [-1.1, -0.88, -2.55],
          [2.45, -0.9, -3.25],
          [5.9, -0.92, -0.7],
        ]}
        color={cyan}
        lineWidth={0.75}
        transparent
        opacity={0.34}
      />
      <Line
        points={[
          [-7.0, -0.91, 2.8],
          [-4.4, -0.9, 0.15],
          [-1.4, -0.88, -2.85],
          [2.1, -0.9, -3.6],
          [5.65, -0.92, -1.05],
        ]}
        color={red}
        lineWidth={0.9}
        transparent
        opacity={0.42}
      />
    </group>
  );
}

function RoomSeams() {
  return (
    <group>
      <mesh position={[0, -0.92, -7.9]}>
        <boxGeometry args={[17.55, 0.075, 0.08]} />
        <meshStandardMaterial color="#161a20" roughness={0.38} metalness={0.56} emissive="#05080a" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, -0.865, -7.835]}>
        <boxGeometry args={[17.15, 0.018, 0.024]} />
        <meshBasicMaterial color={red} transparent opacity={0.62} />
      </mesh>
      <mesh position={[0, 3.46, -7.88]}>
        <boxGeometry args={[17.55, 0.09, 0.1]} />
        <meshStandardMaterial color="#171d24" roughness={0.36} metalness={0.6} emissive="#05080a" emissiveIntensity={0.2} />
      </mesh>
      {[-8.08, 8.08].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.91, -1.18]}>
            <boxGeometry args={[0.09, 0.07, 19.9]} />
            <meshStandardMaterial color="#11161c" roughness={0.4} metalness={0.55} emissive="#030607" emissiveIntensity={0.18} />
          </mesh>
          <mesh position={[x, 1.48, -7.9]}>
            <boxGeometry args={[0.12, 4.58, 0.11]} />
            <meshStandardMaterial color="#222a33" roughness={0.42} metalness={0.48} emissive="#05080b" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[x * 0.998, 1.38, -1.18]}>
            <boxGeometry args={[0.028, 3.9, 18.8]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
      {[-6.15, -3.05, 0, 3.05, 6.15].map((x, index) => (
        <mesh key={x} position={[x, 1.4, -7.77]}>
          <boxGeometry args={[0.035, 3.65, 0.04]} />
          <meshBasicMaterial color={index % 2 ? cyan : red} transparent opacity={index % 2 ? 0.28 : 0.38} />
        </mesh>
      ))}
    </group>
  );
}

function ClosedBackWall() {
  return (
    <group>
      <RoundedBox args={[17.25, 4.38, 0.13]} radius={0.035} position={[0, 1.48, -8.11]}>
        <meshStandardMaterial color="#2b333d" roughness={0.58} metalness={0.28} emissive="#080d11" emissiveIntensity={0.36} />
      </RoundedBox>
      <RoundedBox args={[16.5, 1.18, 0.08]} radius={0.025} position={[0, 2.58, -7.985]}>
        <meshStandardMaterial color="#343d48" roughness={0.5} metalness={0.34} emissive="#080d11" emissiveIntensity={0.3} />
      </RoundedBox>
      <RoundedBox args={[16.5, 1.36, 0.08]} radius={0.025} position={[0, 0.14, -7.985]}>
        <meshStandardMaterial color="#222a32" roughness={0.54} metalness={0.3} emissive="#060a0d" emissiveIntensity={0.26} />
      </RoundedBox>
      {[-7.55, -5.05, -2.55, 0, 2.55, 5.05, 7.55].map((x, index) => (
        <group key={x} position={[x, 1.15, -7.95]}>
          <RoundedBox args={[2.1, 3.35, 0.09]} radius={0.018}>
            <meshStandardMaterial
              color={index % 2 ? "#2d3640" : "#26303a"}
              roughness={0.54}
              metalness={0.3}
              emissive={index % 2 ? "#070c10" : "#060a0e"}
              emissiveIntensity={0.32}
            />
          </RoundedBox>
          <mesh position={[0, 0, 0.066]}>
            <boxGeometry args={[0.035, 3.08, 0.018]} />
            <meshBasicMaterial color="#333941" transparent opacity={0.38} />
          </mesh>
          <mesh position={[0, 1.54, 0.065]}>
            <boxGeometry args={[1.82, 0.026, 0.018]} />
            <meshBasicMaterial color={index % 2 ? cyan : red} transparent opacity={0.34} />
          </mesh>
          <mesh position={[0, -1.54, 0.065]}>
            <boxGeometry args={[1.82, 0.026, 0.018]} />
            <meshBasicMaterial color={index % 2 ? red : cyan} transparent opacity={0.26} />
          </mesh>
        </group>
      ))}
      {[-6.28, -3.76, -1.25, 1.25, 3.76, 6.28].map((x, index) => (
        <mesh key={`rib-${x}`} position={[x, 1.5, -7.84]}>
          <boxGeometry args={[0.05, 4.05, 0.055]} />
          <meshBasicMaterial color={index % 2 ? cyan : red} transparent opacity={index % 2 ? 0.2 : 0.28} />
        </mesh>
      ))}
      {[-8.04, 8.04].map((x) => (
        <group key={x} position={[x, 1.25, -7.1]} rotation={[0, x < 0 ? 0.44 : -0.44, 0]}>
          <RoundedBox args={[1.55, 4.0, 0.16]} radius={0.03}>
            <meshStandardMaterial color="#1d232b" roughness={0.54} metalness={0.28} emissive="#030506" emissiveIntensity={0.18} />
          </RoundedBox>
          <mesh position={[0, 0, 0.1]}>
            <boxGeometry args={[0.04, 3.55, 0.022]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.28} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.88, -7.82]}>
        <boxGeometry args={[17.75, 0.32, 0.28]} />
        <meshStandardMaterial color="#171b21" roughness={0.46} metalness={0.52} emissive="#020405" emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, -0.93, -7.82]}>
        <boxGeometry args={[17.75, 0.22, 0.3]} />
        <meshStandardMaterial color="#07080a" roughness={0.5} metalness={0.48} />
      </mesh>
      <mesh position={[0, 1.48, -7.99]}>
        <boxGeometry args={[16.8, 0.045, 0.035]} />
        <meshBasicMaterial color={red} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0, 2.94, -7.99]}>
        <boxGeometry args={[16.8, 0.035, 0.035]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, 0.62, -7.84]}>
        <boxGeometry args={[16.8, 0.032, 0.035]} />
        <meshBasicMaterial color="#343941" transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

function WallCladding() {
  return (
    <group>
      {[-6.4, -3.2, 0, 3.2, 6.4].map((x, index) => (
        <group key={x} position={[x, 1.18, -7.86]}>
          <RoundedBox args={[1.85, 2.55, 0.045]} radius={0.025}>
            <meshStandardMaterial color={index % 2 ? "#252b33" : "#1d242b"} roughness={0.58} metalness={0.3} emissive="#030506" emissiveIntensity={0.18} />
          </RoundedBox>
          <mesh position={[0, 1.34, 0.035]}>
            <boxGeometry args={[1.62, 0.018, 0.018]} />
            <meshBasicMaterial color={index % 2 ? cyan : red} transparent opacity={0.32} />
          </mesh>
          <mesh position={[0, -1.34, 0.035]}>
            <boxGeometry args={[1.62, 0.018, 0.018]} />
            <meshBasicMaterial color={index % 2 ? red : cyan} transparent opacity={0.22} />
          </mesh>
        </group>
      ))}
      {[-7.2, 7.2].map((x) => (
        <group key={x} position={[x, 1.45, -6.25]} rotation={[0, x < 0 ? 0.18 : -0.18, 0]}>
          <RoundedBox args={[0.72, 2.72, 0.16]} radius={0.035}>
            <meshStandardMaterial color="#15191f" roughness={0.48} metalness={0.42} />
          </RoundedBox>
          <mesh position={[0, 0, 0.105]}>
            <boxGeometry args={[0.035, 2.55, 0.035]} />
            <meshBasicMaterial color={red} transparent opacity={0.42} />
          </mesh>
        </group>
      ))}
      <CityReflection />
    </group>
  );
}

function CityReflection() {
  return (
    <group position={[0, 2.34, -7.82]}>
      {Array.from({ length: 24 }).map((_, index) => {
        const x = -7.4 + index * 0.64;
        const h = 0.22 + ((index * 17) % 9) * 0.055;
        return (
          <mesh key={index} position={[x, -0.42 + h / 2, 0.06]}>
            <boxGeometry args={[0.2 + (index % 3) * 0.06, h, 0.016]} />
            <meshBasicMaterial color={index % 4 === 0 ? red : cyan} transparent opacity={index % 4 === 0 ? 0.14 : 0.12} />
          </mesh>
        );
      })}
    </group>
  );
}

function OfficeBrandSign() {
  return (
    <group position={[0, 2.9, -7.79]}>
      <Text fontSize={0.34} color="#f3f0ea" anchorX="center" anchorY="middle">
        VITAEY
      </Text>
      <Text position={[0, -0.34, 0]} fontSize={0.08} color={red} anchorX="center" anchorY="middle">
        CAREER SIGNAL OFFICE
      </Text>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[2.5, 0.02, 0.02]} />
        <meshBasicMaterial color={red} transparent opacity={0.42} />
      </mesh>
    </group>
  );
}

function CeilingSystem() {
  return (
    <group>
      {[-6.0, -3.0, 0, 3.0, 6.0].map((x) =>
        [-5.6, -2.5, 0.6].map((z) => (
          <group key={`${x}-${z}`} position={[x, 4.145, z]}>
            <mesh>
              <boxGeometry args={[1.05, 0.028, 1.05]} />
              <meshStandardMaterial color="#060708" roughness={0.62} metalness={0.28} />
            </mesh>
            <mesh position={[0, -0.02, 0]}>
              <boxGeometry args={[0.92, 0.012, 0.018]} />
              <meshBasicMaterial color="#20242a" transparent opacity={0.5} />
            </mesh>
          </group>
        )),
      )}
      {[-5.6, -1.85, 1.85, 5.6].map((x, index) => (
        <group key={x} position={[x, 3.92, -2.2 + (index % 2) * 0.6]}>
          <mesh>
            <boxGeometry args={[1.65, 0.035, 0.14]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.72} />
          </mesh>
          <pointLight color={cyan} intensity={index % 2 ? 4.5 : 3.4} distance={5.5} />
        </group>
      ))}
      <mesh position={[0, 3.86, 1.7]}>
        <boxGeometry args={[12.5, 0.035, 0.08]} />
        <meshStandardMaterial color="#060607" roughness={0.44} metalness={0.64} />
      </mesh>
      {[-5.6, -2.8, 0, 2.8, 5.6].map((x) => (
        <group key={x} position={[x, 3.78, 1.72]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.012, 8, 18]} />
            <meshStandardMaterial color="#08090b" roughness={0.42} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.34, 8]} />
            <meshStandardMaterial color="#08090b" roughness={0.42} metalness={0.7} />
          </mesh>
        </group>
      ))}
      {[-4.2, 4.2].map((x) => (
        <group key={x} position={[x, 3.78, -6.2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.025, 22]} />
            <meshStandardMaterial color="#11141a" roughness={0.54} metalness={0.46} />
          </mesh>
          <mesh position={[0, -0.014, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.11, 20]} />
            <meshBasicMaterial color={red} transparent opacity={0.28} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[-6.8, 6.8].map((x) => (
        <mesh key={x} position={[x, 1.55, -7.95]}>
          <boxGeometry args={[0.035, 3.35, 0.04]} />
          <meshBasicMaterial color={red} transparent opacity={0.46} />
        </mesh>
      ))}
    </group>
  );
}

function MeetingZone({ deskTexture, fabricTexture }: { deskTexture: THREE.Texture; fabricTexture: THREE.Texture }) {
  return (
    <group position={[0, 0, -3.86]}>
      <RoundedBox args={[5.6, 0.18, 1.62]} radius={0.06} position={[0, -0.36, 0.78]}>
        <meshStandardMaterial map={deskTexture} color="#161212" roughness={0.44} metalness={0.32} />
      </RoundedBox>
      <RoundedBox args={[2.2, 0.035, 0.22]} radius={0.025} position={[0, -0.24, 0.78]}>
        <meshStandardMaterial color="#050506" roughness={0.36} metalness={0.62} />
      </RoundedBox>
      <mesh position={[0, -0.205, 0.78]}>
        <cylinderGeometry args={[0.16, 0.16, 0.035, 24]} />
        <meshStandardMaterial color="#090a0c" roughness={0.44} metalness={0.54} />
      </mesh>
      {[-1.85, -0.55, 0.55, 1.85].map((x, index) => (
        <group key={x} position={[x, -0.25, 0.78 + (index % 2 ? 0.38 : -0.38)]} rotation={[0, index % 2 ? -0.14 : 0.18, 0]}>
          <RoundedBox args={[0.46, 0.012, 0.29]} radius={0.008}>
            <meshStandardMaterial color="#eee8dd" roughness={0.6} metalness={0.02} />
          </RoundedBox>
          <Line points={[[-0.18, 0.02, 0.06], [0.12, 0.021, 0.03]]} color={red} lineWidth={1} />
        </group>
      ))}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[4.75, 1.95, 0.045]} />
        <meshPhysicalMaterial color="#0b1418" roughness={0.15} metalness={0.05} transparent opacity={0.25} transmission={0.45} />
      </mesh>
      {[-1.55, 0, 1.55].map((x) => (
        <mesh key={x} position={[x, 0.72, 0.028]}>
          <boxGeometry args={[0.018, 1.88, 0.018]} />
          <meshBasicMaterial color="#9bdff0" transparent opacity={0.18} />
        </mesh>
      ))}
      {[-2.7, 2.7].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.12, 2.58, 0.12]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.88} />
        </mesh>
      ))}
      <mesh position={[0, 1.82, 0]}>
        <boxGeometry args={[6.1, 0.075, 0.075]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.72} />
      </mesh>
      {[-2.05, -0.7, 0.7, 2.05].map((x, index) => (
        <OfficeChair
          key={x}
          position={[x, -0.62, 1.85]}
          rotation={[0, index % 2 ? -0.16 : 0.16, 0]}
          fabricTexture={fabricTexture}
        />
      ))}
      <PresentationScreen position={[0, 1.64, 0.075]} width={3.95} height={1.55} title="VITAEY MATCH ROOM" variant="radar" />
    </group>
  );
}

function DeskCluster({
  deskTexture,
  fabricTexture,
  compact,
}: {
  deskTexture: THREE.Texture;
  fabricTexture: THREE.Texture;
  compact: boolean;
}) {
  const desks = [
    { x: -4.85, z: 0.85, rotate: 0.08, screen: "curriculo" },
    { x: -1.65, z: 0.78, rotate: 0.02, screen: "radar" },
    { x: 1.65, z: 0.78, rotate: -0.02, screen: "pipeline" },
    { x: 4.85, z: 0.85, rotate: -0.08, screen: "integracoes" },
  ];
  const visibleDesks = compact ? desks.slice(1, 3) : desks;

  return (
    <group>
      {visibleDesks.map((desk, index) => (
        <group key={desk.x} position={[desk.x, 0, desk.z]} rotation={[0, desk.rotate, 0]}>
          <OfficeDesk deskTexture={deskTexture} screen={desk.screen} />
          <OfficeChair position={[0, -0.62, 1.22]} rotation={[0, index % 2 ? -0.06 : 0.06, 0]} fabricTexture={fabricTexture} />
          <CpuTower position={[0.93, -0.68, -0.3]} />
          {index % 2 === 0 ? <DeskLamp position={[-0.78, -0.25, -0.2]} /> : <DocumentTray position={[-0.8, -0.235, 0.28]} />}
          <DeskAccessories index={index} />
        </group>
      ))}
    </group>
  );
}

function OfficeDesk({ deskTexture, screen }: { deskTexture: THREE.Texture; screen: string }) {
  return (
    <group>
      <RoundedBox args={[2.35, 0.16, 1.28]} radius={0.04} position={[0, -0.36, 0]}>
        <meshStandardMaterial map={deskTexture} color="#171212" roughness={0.42} metalness={0.36} />
      </RoundedBox>
      <mesh position={[-1.08, -0.69, 0.01]}>
        <boxGeometry args={[0.045, 0.56, 1.08]} />
        <meshStandardMaterial color="#080708" roughness={0.5} metalness={0.34} />
      </mesh>
      <mesh position={[1.08, -0.69, 0.01]}>
        <boxGeometry args={[0.045, 0.56, 1.08]} />
        <meshStandardMaterial color="#080708" roughness={0.5} metalness={0.34} />
      </mesh>
      {[-0.42, 0, 0.42].map((z) => (
        <mesh key={z} position={[1.108, -0.62, z]}>
          <boxGeometry args={[0.018, 0.018, 0.24]} />
          <meshBasicMaterial color={z === 0 ? red : "#282a2e"} transparent opacity={0.78} />
        </mesh>
      ))}
      <mesh position={[0.76, -0.255, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.105, 28]} />
        <meshStandardMaterial color="#050506" roughness={0.5} metalness={0.52} />
      </mesh>
      {[-0.92, 0.92].flatMap((x) =>
        [-0.46, 0.46].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.72, z]}>
            <cylinderGeometry args={[0.04, 0.052, 0.58, 8]} />
            <meshStandardMaterial color="#060607" roughness={0.7} metalness={0.34} />
          </mesh>
        )),
      )}
      <Monitor position={[0, 0.39, -0.43]} variant={screen} />
      <Keyboard position={[0, -0.235, 0.16]} />
      <Mouse position={[0.62, -0.225, 0.18]} />
      <Laptop position={[-0.66, -0.22, 0.22]} variant={screen === "pipeline" ? "radar" : "pipeline"} />
      <Line
        points={[
          [0.14, -0.25, -0.18],
          [0.42, -0.27, -0.2],
          [0.78, -0.27, -0.28],
        ]}
        color="#18191d"
        lineWidth={1}
        transparent
        opacity={0.8}
      />
    </group>
  );
}

function Monitor({ position, variant }: { position: [number, number, number]; variant: string }) {
  const texture = useMemo(() => makeScreenTexture(variant), [variant]);
  return (
    <group position={position}>
      <RoundedBox args={[1.12, 0.72, 0.055]} radius={0.035} smoothness={8} castShadow>
        <meshStandardMaterial color="#050506" roughness={0.34} metalness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.038]}>
        <planeGeometry args={[1.0, 0.58]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[1.0, 0.58]} />
        <meshPhysicalMaterial color="#d9fbff" transparent opacity={0.055} roughness={0.04} metalness={0.02} transmission={0.14} />
      </mesh>
      <mesh position={[-0.48, -0.345, 0.05]}>
        <sphereGeometry args={[0.014, 10, 10]} />
        <meshBasicMaterial color={variant === "pipeline" ? cyan : red} />
      </mesh>
      {[-0.28, -0.18, -0.08].map((x) => (
        <mesh key={x} position={[x, -0.348, 0.05]}>
          <boxGeometry args={[0.055, 0.009, 0.008]} />
          <meshBasicMaterial color="#30353d" transparent opacity={0.82} />
        </mesh>
      ))}
      <mesh position={[0, -0.46, 0]}>
        <boxGeometry args={[0.08, 0.34, 0.05]} />
        <meshStandardMaterial color="#050506" roughness={0.48} metalness={0.7} />
      </mesh>
      <RoundedBox args={[0.48, 0.045, 0.3]} radius={0.03} position={[0, -0.63, 0.02]}>
        <meshStandardMaterial color="#060607" roughness={0.5} metalness={0.58} />
      </RoundedBox>
      <Line points={[[0, -0.63, -0.08], [0.12, -0.72, -0.22], [0.38, -0.72, -0.34]]} color="#16171b" lineWidth={1} />
    </group>
  );
}

function Laptop({ position, variant }: { position: [number, number, number]; variant: string }) {
  const texture = useMemo(() => makeScreenTexture(variant), [variant]);
  return (
    <group position={position} rotation={[-0.04, 0.05, 0]}>
      <RoundedBox args={[0.62, 0.035, 0.43]} radius={0.025} castShadow>
        <meshStandardMaterial color="#060607" roughness={0.44} metalness={0.62} />
      </RoundedBox>
      {Array.from({ length: 12 }).map((_, index) => (
        <mesh key={index} position={[-0.23 + (index % 6) * 0.09, 0.025, -0.04 + Math.floor(index / 6) * 0.07]}>
          <boxGeometry args={[0.045, 0.008, 0.028]} />
          <meshBasicMaterial color={index % 4 === 0 ? "#29343a" : "#1a1d21"} transparent opacity={0.78} />
        </mesh>
      ))}
      <mesh position={[0.21, 0.026, 0.15]}>
        <boxGeometry args={[0.12, 0.006, 0.07]} />
        <meshBasicMaterial color="#25282d" transparent opacity={0.8} />
      </mesh>
      <group position={[0, 0.2, -0.21]} rotation={[-0.9, 0, 0]}>
        <RoundedBox args={[0.62, 0.38, 0.035]} radius={0.025}>
          <meshStandardMaterial color="#050506" roughness={0.38} metalness={0.64} />
        </RoundedBox>
        <mesh position={[0, 0, 0.023]}>
          <planeGeometry args={[0.53, 0.3]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.205, 0.024]}>
          <boxGeometry args={[0.5, 0.012, 0.008]} />
          <meshBasicMaterial color={red} transparent opacity={0.42} />
        </mesh>
      </group>
    </group>
  );
}

function Keyboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.86, 0.035, 0.22]} radius={0.025}>
        <meshStandardMaterial color="#050506" roughness={0.5} metalness={0.32} />
      </RoundedBox>
      {Array.from({ length: 16 }).map((_, index) => (
        <mesh key={index} position={[-0.34 + (index % 8) * 0.095, 0.024, -0.04 + Math.floor(index / 8) * 0.08]}>
          <boxGeometry args={[0.055, 0.012, 0.035]} />
          <meshBasicMaterial color={index % 5 === 0 ? red : "#2b2d31"} transparent opacity={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function Mouse({ position }: { position: [number, number, number] }) {
  return (
    <RoundedBox args={[0.16, 0.045, 0.24]} radius={0.07} position={position}>
      <meshStandardMaterial color="#08090a" roughness={0.38} metalness={0.45} />
    </RoundedBox>
  );
}

function DeskAccessories({ index }: { index: number }) {
  return (
    <group>
      <RoundedBox args={[0.42, 0.012, 0.28]} radius={0.008} position={[-0.17, -0.236, 0.45]} rotation={[0, 0.12, 0]}>
        <meshStandardMaterial color={index % 2 ? "#24272c" : "#efe9df"} roughness={0.65} metalness={0.02} />
      </RoundedBox>
      <Line
        points={[
          [-0.34, -0.225, 0.5],
          [-0.05, -0.222, 0.49],
        ]}
        color={index % 2 ? cyan : red}
        lineWidth={1.1}
        transparent
        opacity={0.7}
      />
      <group position={[0.9, -0.19, 0.38]}>
        <mesh>
          <cylinderGeometry args={[0.075, 0.08, 0.14, 18]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.42} metalness={0.36} />
        </mesh>
        <mesh position={[0.07, 0.005, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.06, 0.012, 8, 18, Math.PI * 1.2]} />
          <meshStandardMaterial color="#0b0c0e" roughness={0.42} metalness={0.36} />
        </mesh>
      </group>
      <group position={[-0.94, -0.16, 0.46]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.055, 0.22, 12]} />
          <meshStandardMaterial color="#07080a" roughness={0.5} metalness={0.44} />
        </mesh>
        {[-0.04, 0.01, 0.05].map((x, pinIndex) => (
          <mesh key={x} position={[x, 0.16, 0]} rotation={[0.1 + pinIndex * 0.2, 0, 0.08]}>
            <cylinderGeometry args={[0.006, 0.006, 0.24, 6]} />
            <meshBasicMaterial color={pinIndex === 1 ? red : cyan} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function OfficeChair({
  position,
  rotation = [0, 0, 0],
  fabricTexture,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  fabricTexture: THREE.Texture;
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.72, 0.16, 0.68]} radius={0.12} position={[0, 0.16, 0]} castShadow>
        <meshStandardMaterial map={fabricTexture} color="#111215" roughness={0.72} metalness={0.04} />
      </RoundedBox>
      <RoundedBox args={[0.72, 0.86, 0.15]} radius={0.12} position={[0, 0.68, 0.32]} rotation={[-0.16, 0, 0]} castShadow>
        <meshStandardMaterial map={fabricTexture} color="#101114" roughness={0.76} metalness={0.04} />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.18, 0.13]} radius={0.07} position={[0, 1.2, 0.26]} rotation={[-0.16, 0, 0]}>
        <meshStandardMaterial map={fabricTexture} color="#101114" roughness={0.76} metalness={0.04} />
      </RoundedBox>
      {[-0.22, 0, 0.22].map((x) => (
        <Line
          key={x}
          points={[
            [x, 0.3, 0.405],
            [x, 1.08, 0.3],
          ]}
          color="#20242a"
          lineWidth={0.8}
          transparent
          opacity={0.56}
        />
      ))}
      {[-0.45, 0.45].map((x) => (
        <RoundedBox key={x} args={[0.09, 0.08, 0.55]} radius={0.04} position={[x, 0.33, -0.02]}>
          <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.55} />
        </RoundedBox>
      ))}
      {[-0.49, 0.49].map((x) => (
        <mesh key={`post-${x}`} position={[x, 0.08, 0.16]}>
          <cylinderGeometry args={[0.018, 0.018, 0.4, 8]} />
          <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.62} />
        </mesh>
      ))}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.055, 0.075, 0.62, 12]} />
        <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.62} />
      </mesh>
      {Array.from({ length: 5 }).map((_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        return (
          <group key={index} rotation={[0, angle, 0]}>
            <mesh position={[0.36, -0.45, 0]}>
              <boxGeometry args={[0.62, 0.045, 0.045]} />
              <meshStandardMaterial color="#050506" roughness={0.48} metalness={0.6} />
            </mesh>
            <mesh position={[0.7, -0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.06, 0.018, 8, 16]} />
              <meshStandardMaterial color="#090a0b" roughness={0.5} metalness={0.45} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function CpuTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.26, 0.62, 0.4]} radius={0.045}>
        <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.62} />
      </RoundedBox>
      {Array.from({ length: 4 }).map((_, index) => (
        <mesh key={index} position={[0, 0.18 - index * 0.12, 0.211]}>
          <boxGeometry args={[0.17, 0.018, 0.012]} />
          <meshBasicMaterial color={index % 2 ? "#2d3138" : red} transparent opacity={index % 2 ? 0.72 : 0.88} />
        </mesh>
      ))}
      <mesh position={[0.08, -0.23, 0.214]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshBasicMaterial color={cyan} />
      </mesh>
    </group>
  );
}

function DeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.035, 18]} />
        <meshStandardMaterial color="#050506" roughness={0.45} metalness={0.58} />
      </mesh>
      <mesh position={[0.05, 0.22, -0.06]} rotation={[0.45, 0, -0.25]}>
        <cylinderGeometry args={[0.018, 0.018, 0.48, 10]} />
        <meshStandardMaterial color="#060607" roughness={0.35} metalness={0.72} />
      </mesh>
      <mesh position={[0.16, 0.42, -0.2]} rotation={[0.8, 0, -0.55]}>
        <coneGeometry args={[0.14, 0.18, 18]} />
        <meshBasicMaterial color={red} transparent opacity={0.8} />
      </mesh>
      <pointLight position={[0.18, 0.34, -0.23]} color={red} intensity={2.2} distance={2.2} />
    </group>
  );
}

function DocumentTray({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0.12, 0]}>
      {Array.from({ length: 4 }).map((_, index) => (
        <RoundedBox key={index} args={[0.5, 0.012, 0.34]} radius={0.01} position={[0, index * 0.026, index * -0.015]}>
          <meshStandardMaterial color={index % 2 ? "#f1eee8" : "#d9d5cc"} roughness={0.56} metalness={0.02} />
        </RoundedBox>
      ))}
      <Line points={[[-0.18, 0.12, 0.15], [0.14, 0.13, 0.12], [0.24, 0.14, -0.08]]} color={red} lineWidth={1.2} />
    </group>
  );
}

function WallDashboard({ signalScore }: { signalScore: number }) {
  const displayedScore = Math.max(0, Math.min(100, signalScore));
  const hasSignal = displayedScore > 0;

  return (
    <group position={[-7.82, 1.58, -2.95]} rotation={[0, Math.PI / 2, 0]}>
      <RoundedBox args={[3.6, 2.22, 0.09]} radius={0.045} position={[0, 0, -0.08]}>
        <meshStandardMaterial color="#202832" roughness={0.48} metalness={0.38} emissive="#060a0d" emissiveIntensity={0.3} />
      </RoundedBox>
      <mesh position={[0, -1.22, -0.025]}>
        <boxGeometry args={[3.18, 0.07, 0.08]} />
        <meshStandardMaterial color="#0b0d10" roughness={0.38} metalness={0.62} />
      </mesh>
      {[-1.42, 1.42].map((x) => (
        <mesh key={x} position={[x, 0, -0.01]}>
          <boxGeometry args={[0.05, 2.02, 0.075]} />
          <meshBasicMaterial color={cyan} transparent opacity={0.28} />
        </mesh>
      ))}
      <PresentationScreen
        width={3.15}
        height={1.8}
        title="CURRICULO"
        variant="curriculo"
        metric={hasSignal ? `${displayedScore}%` : "SEM MATCH"}
      />
      <mesh position={[0, -1.12, 0.02]}>
        <torusGeometry args={[0.55 + displayedScore / 360, 0.012, 10, 120]} />
        <meshBasicMaterial color={red} transparent opacity={0.42} wireframe />
      </mesh>
      <Text position={[-0.45, -1.15, 0.05]} fontSize={hasSignal ? 0.18 : 0.12} color="#fff" anchorX="left">
        {hasSignal ? `${displayedScore}%` : "SEM MATCH"}
      </Text>
    </group>
  );
}

function PresentationScreen({
  width,
  height,
  title,
  variant,
  position = [0, 0, 0],
  metric,
}: {
  width: number;
  height: number;
  title: string;
  variant: string;
  position?: [number, number, number];
  metric?: string;
}) {
  const texture = useMemo(() => makeScreenTexture(variant, title, metric), [variant, title, metric]);
  return (
    <group position={position}>
      <RoundedBox args={[width + 0.18, height + 0.18, 0.075]} radius={0.045} smoothness={8}>
        <meshStandardMaterial color="#050506" roughness={0.35} metalness={0.64} />
      </RoundedBox>
      <mesh position={[0, 0, 0.048]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={red} transparent opacity={0.045} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ResumeScanner() {
  return (
    <group position={[-3.2, -0.35, -2.1]} rotation={[-0.2, 0.12, -0.08]}>
      <RoundedBox args={[1.2, 0.08, 1.55]} radius={0.04} position={[0, -0.08, 0]}>
        <meshStandardMaterial color="#090a0c" roughness={0.5} metalness={0.42} />
      </RoundedBox>
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={index} position={[index * 0.04, index * 0.03, -index * 0.022]}>
          <boxGeometry args={[0.95, 0.016, 1.25]} />
          <meshStandardMaterial color={index % 2 ? "#f2efe8" : "#dcd8cf"} roughness={0.55} metalness={0.02} />
        </mesh>
      ))}
      <Line points={[[-0.46, 0.17, 0.54], [0.32, 0.18, 0.54]]} color={red} lineWidth={2} />
      <Line points={[[-0.38, 0.17, 0.28], [0.2, 0.18, 0.28]]} color={cyan} lineWidth={1.5} />
      <mesh position={[0, 0.25, 0.1]}>
        <boxGeometry args={[1.1, 0.012, 0.04]} />
        <meshBasicMaterial color={red} transparent opacity={0.82} />
      </mesh>
    </group>
  );
}

function PipelineWall() {
  return (
    <group position={[3.85, -0.86, -4.55]} rotation={[0, -0.28, 0]}>
      <RoundedBox args={[3.55, 0.34, 0.78]} radius={0.055} position={[0, 0.14, 0]}>
        <meshStandardMaterial color="#08090b" roughness={0.42} metalness={0.58} />
      </RoundedBox>
      <RoundedBox args={[3.18, 0.08, 0.64]} radius={0.035} position={[0, 0.34, -0.02]}>
        <meshStandardMaterial color="#15181d" roughness={0.34} metalness={0.68} />
      </RoundedBox>
      <mesh position={[0, 0.52, -0.2]} rotation={[-0.48, 0, 0]}>
        <boxGeometry args={[3.18, 0.045, 0.42]} />
        <meshStandardMaterial color="#07080a" roughness={0.28} metalness={0.72} />
      </mesh>
      {["SALVA", "REVISA", "ENVIA", "ENTREV", "OFERTA"].map((label, index) => (
        <group key={label} position={[-1.28 + index * 0.64, 0.58, -0.08]} rotation={[-0.48, 0, 0]}>
          <RoundedBox args={[0.42, 0.24, 0.03]} radius={0.018}>
            <meshStandardMaterial color="#101923" roughness={0.34} metalness={0.42} emissive={index % 2 ? "#08323a" : "#320808"} emissiveIntensity={0.24} />
          </RoundedBox>
          <mesh position={[0, 0.045, 0.028]}>
            <boxGeometry args={[0.28, 0.022, 0.01]} />
            <meshBasicMaterial color={index % 2 ? cyan : red} transparent opacity={0.72} />
          </mesh>
          <mesh position={[0.14, -0.055, 0.03]}>
            <sphereGeometry args={[0.025 + index * 0.002, 12, 12]} />
            <meshBasicMaterial color={index % 2 ? cyan : red} />
          </mesh>
          <Text position={[-0.17, -0.09, 0.032]} fontSize={0.043} color="#f1eee8" anchorX="left">
            {label}
          </Text>
        </group>
      ))}
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, -0.18, 0.18]}>
          <cylinderGeometry args={[0.055, 0.065, 0.72, 10]} />
          <meshStandardMaterial color="#050607" roughness={0.52} metalness={0.58} />
        </mesh>
      ))}
    </group>
  );
}

function ServerRack() {
  return (
    <group position={[6.9, 0.16, -1.35]} rotation={[0, -0.32, 0]}>
      <RoundedBox args={[0.72, 2.0, 0.54]} radius={0.045}>
        <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.6} />
      </RoundedBox>
      {Array.from({ length: 8 }).map((_, index) => (
        <group key={index} position={[0, 0.78 - index * 0.2, 0.29]}>
          <mesh>
            <boxGeometry args={[0.56, 0.035, 0.02]} />
            <meshBasicMaterial color={index % 3 ? "#22252b" : red} transparent opacity={index % 3 ? 0.72 : 0.9} />
          </mesh>
          <mesh position={[0.24, 0, 0.02]}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color={index % 2 ? cyan : red} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ExecutiveShelving() {
  return (
    <group>
      <ShelfUnit position={[-6.95, 0.56, -6.75]} rotation={[0, 0.14, 0]} />
      <ShelfUnit position={[6.95, 0.56, -6.75]} rotation={[0, -0.14, 0]} mirrored />
    </group>
  );
}

function ShelfUnit({
  position,
  rotation,
  mirrored = false,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  mirrored?: boolean;
}) {
  const binders = mirrored
    ? ["#15191f", "#ff2a2a", "#2b3038", "#6be7ff", "#16191f", "#2b3038"]
    : ["#2b3038", "#15191f", "#6be7ff", "#2b3038", "#ff2a2a", "#16191f"];

  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[1.55, 2.12, 0.42]} radius={0.04}>
        <meshStandardMaterial color="#070708" roughness={0.54} metalness={0.42} />
      </RoundedBox>
      {[-0.62, 0, 0.62].map((y) => (
        <mesh key={y} position={[0, y, 0.23]}>
          <boxGeometry args={[1.38, 0.045, 0.08]} />
          <meshStandardMaterial color="#111014" roughness={0.44} metalness={0.5} />
        </mesh>
      ))}
      {binders.map((color, index) => (
        <RoundedBox
          key={index}
          args={[0.14 + (index % 2) * 0.035, 0.52 + (index % 3) * 0.04, 0.28]}
          radius={0.012}
          position={[-0.55 + index * 0.19, 0.83 - (index % 2) * 0.03, 0.26]}
          rotation={[0, 0, (index % 3 - 1) * 0.035]}
        >
          <meshStandardMaterial color={color} roughness={0.48} metalness={color === cyan || color === red ? 0.2 : 0.36} />
        </RoundedBox>
      ))}
      {Array.from({ length: 5 }).map((_, index) => (
        <RoundedBox key={index} args={[0.25, 0.18, 0.28]} radius={0.02} position={[-0.46 + index * 0.24, 0.1, 0.26]}>
          <meshStandardMaterial color={index % 2 ? "#171012" : "#0d1115"} roughness={0.58} metalness={0.18} />
        </RoundedBox>
      ))}
      <mesh position={[-0.44, -0.76, 0.24]}>
        <cylinderGeometry args={[0.13, 0.17, 0.38, 18]} />
        <meshStandardMaterial color="#101816" roughness={0.7} metalness={0.04} />
      </mesh>
      <mesh position={[0.44, -0.76, 0.24]}>
        <octahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={mirrored ? cyan : red} emissive={mirrored ? cyan : red} emissiveIntensity={0.7} roughness={0.28} />
      </mesh>
    </group>
  );
}

function OfficeMicroDetails() {
  return (
    <group>
      <WallMountedStatusBoards />
      <CableRuns />
      <ReceptionPedestal />
    </group>
  );
}

function CommandRoomDetails() {
  return (
    <group>
      <WallScreenArray />
      <SideConsoleWall />
      <UtilityZone />
      <CeilingServiceGrid />
      <SafetyFloorMarks />
      <CareerHologram />
    </group>
  );
}

function WallScreenArray() {
  return (
    <group>
      <RoundedBox args={[11.4, 1.42, 0.08]} radius={0.035} position={[0, 2.42, -8.08]}>
        <meshStandardMaterial color="#36414c" roughness={0.46} metalness={0.36} emissive="#0b1218" emissiveIntensity={0.42} />
      </RoundedBox>
      <mesh position={[0, 3.16, -7.965]}>
        <boxGeometry args={[10.85, 0.042, 0.038]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0, 1.68, -7.965]}>
        <boxGeometry args={[10.85, 0.038, 0.038]} />
        <meshBasicMaterial color={red} transparent opacity={0.36} />
      </mesh>
      {[
        { x: -4.75, title: "VAGAS LIVE", variant: "world" },
        { x: -2.2, title: "PERFIL", variant: "perfil" },
        { x: 2.2, title: "SOBRE", variant: "sobre" },
        { x: 4.75, title: "INTEGRACOES", variant: "integracoes" },
      ].map((screen) => (
        <group key={screen.title} position={[screen.x, 2.42, -8.0]}>
          <RoundedBox args={[2.38, 1.32, 0.06]} radius={0.028} position={[0, 0, -0.075]}>
            <meshStandardMaterial color="#2a333d" roughness={0.48} metalness={0.34} emissive="#080d12" emissiveIntensity={0.36} />
          </RoundedBox>
          <mesh position={[0, -0.72, -0.02]}>
            <boxGeometry args={[0.12, 0.22, 0.08]} />
            <meshStandardMaterial color="#090b0e" roughness={0.4} metalness={0.68} />
          </mesh>
          <mesh position={[0, -0.88, -0.035]}>
            <boxGeometry args={[1.42, 0.045, 0.06]} />
            <meshStandardMaterial color="#090b0e" roughness={0.4} metalness={0.68} />
          </mesh>
          <PresentationScreen width={1.9} height={0.92} title={screen.title} variant={screen.variant} />
          <mesh position={[0, -0.58, 0.07]}>
            <boxGeometry args={[1.72, 0.035, 0.06]} />
            <meshStandardMaterial color="#08090b" roughness={0.42} metalness={0.64} />
          </mesh>
        </group>
      ))}
      {[-3.45, -1.15, 1.15, 3.45].map((x, index) => (
        <group key={x} position={[x, 1.64, -8.02]}>
          <VentGrille width={0.8} height={0.34} color={index % 2 ? cyan : red} />
        </group>
      ))}
    </group>
  );
}

function VentGrille({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <group>
      <RoundedBox args={[width, height, 0.035]} radius={0.02}>
        <meshStandardMaterial color="#060708" roughness={0.52} metalness={0.5} />
      </RoundedBox>
      {Array.from({ length: 6 }).map((_, index) => (
        <mesh key={index} position={[0, height / 2 - 0.07 - index * (height / 7), 0.028]}>
          <boxGeometry args={[width - 0.16, 0.012, 0.012]} />
          <meshBasicMaterial color={index % 2 ? "#303740" : color} transparent opacity={index % 2 ? 0.48 : 0.36} />
        </mesh>
      ))}
    </group>
  );
}

function SideConsoleWall() {
  return (
    <group>
      {[-2.25, 0, 2.25].map((x, index) => (
        <group key={x} position={[x, -0.42, -6.62]}>
          <RoundedBox args={[1.95, 0.72, 0.52]} radius={0.035}>
            <meshStandardMaterial color="#070708" roughness={0.46} metalness={0.52} />
          </RoundedBox>
          <group position={[0, 0.44, 0.06]} rotation={[-0.44, 0, 0]}>
            <PresentationScreen width={1.42} height={0.38} title={index === 1 ? "TRIAGEM" : "QUEUE"} variant={index === 1 ? "ops" : "radar"} />
          </group>
          <ConsoleButtons offset={index} />
        </group>
      ))}
      {[-6.95, 6.95].map((x) => (
        <group key={x} position={[x, -0.54, -3.9]} rotation={[0, x < 0 ? 0.32 : -0.32, 0]}>
          <RoundedBox args={[1.18, 0.44, 0.44]} radius={0.035}>
            <meshStandardMaterial color="#070708" roughness={0.44} metalness={0.56} />
          </RoundedBox>
          <mesh position={[0, 0.28, 0.08]} rotation={[-0.52, 0, 0]}>
            <boxGeometry args={[0.94, 0.032, 0.32]} />
            <meshBasicMaterial color={x < 0 ? cyan : red} transparent opacity={0.32} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ConsoleButtons({ offset }: { offset: number }) {
  return (
    <group position={[-0.58, 0.4, 0.28]} rotation={[-0.44, 0, 0]}>
      {Array.from({ length: 7 }).map((_, index) => (
        <mesh key={index} position={[index * 0.18, 0, 0]}>
          <boxGeometry args={[0.09, 0.018, 0.05]} />
          <meshBasicMaterial color={(index + offset) % 3 === 0 ? red : (index + offset) % 3 === 1 ? cyan : "#353a42"} transparent opacity={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function UtilityZone() {
  return (
    <group>
      <StorageCabinet position={[-7.55, -0.15, 1.58]} rotation={[0, Math.PI / 2, 0]} label="RH" />
      <StorageCabinet position={[7.55, -0.15, 1.72]} rotation={[0, -Math.PI / 2, 0]} label="OPS" />
      <StorageCabinet position={[5.86, -0.15, -7.15]} rotation={[0, -0.04, 0]} label="DATA" wide />
      <WaterCooler position={[-7.42, -0.58, -0.18]} rotation={[0, Math.PI / 2, 0]} />
      <MaintenancePanel position={[-7.92, 1.02, -2.05]} rotation={[0, Math.PI / 2, 0]} />
      <MaintenancePanel position={[7.92, 1.02, -2.05]} rotation={[0, -Math.PI / 2, 0]} mirror />
    </group>
  );
}

function StorageCabinet({
  position,
  rotation,
  label,
  wide = false,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  label: string;
  wide?: boolean;
}) {
  const width = wide ? 1.35 : 0.82;
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[width, 1.78, 0.46]} radius={0.035}>
        <meshStandardMaterial color="#08090b" roughness={0.52} metalness={0.48} />
      </RoundedBox>
      <mesh position={[0, 0.83, 0.245]}>
        <boxGeometry args={[width - 0.12, 0.035, 0.018]} />
        <meshBasicMaterial color={red} transparent opacity={0.48} />
      </mesh>
      <mesh position={[0, -0.08, 0.252]}>
        <boxGeometry args={[0.018, 1.52, 0.016]} />
        <meshBasicMaterial color="#30343a" transparent opacity={0.58} />
      </mesh>
      {[-0.36, 0, 0.36].map((y, index) => (
        <mesh key={y} position={[0, y, 0.258]}>
          <boxGeometry args={[width - 0.2, 0.018, 0.014]} />
          <meshBasicMaterial color={index % 2 ? cyan : "#343941"} transparent opacity={index % 2 ? 0.42 : 0.62} />
        </mesh>
      ))}
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.03, 0.268]}>
          <boxGeometry args={[0.025, 0.46, 0.018]} />
          <meshStandardMaterial color="#0f1115" roughness={0.36} metalness={0.68} />
        </mesh>
      ))}
      <Text position={[-width / 2 + 0.1, -0.82, 0.27]} fontSize={0.07} color={red} anchorX="left">
        {label}
      </Text>
    </group>
  );
}

function WaterCooler({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.42, 0.92, 0.38]} radius={0.055} position={[0, 0.03, 0]}>
        <meshStandardMaterial color="#d9dde0" roughness={0.35} metalness={0.16} />
      </RoundedBox>
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.19, 0.16, 0.46, 24]} />
        <meshPhysicalMaterial color={cyan} transparent opacity={0.48} roughness={0.08} metalness={0.02} transmission={0.22} />
      </mesh>
      <mesh position={[0, 0.96, 0]}>
        <sphereGeometry args={[0.18, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshPhysicalMaterial color={cyan} transparent opacity={0.38} roughness={0.06} metalness={0.02} transmission={0.24} />
      </mesh>
      <mesh position={[0, 0.24, 0.2]}>
        <boxGeometry args={[0.28, 0.12, 0.035]} />
        <meshStandardMaterial color="#111317" roughness={0.4} metalness={0.52} />
      </mesh>
      {[-0.07, 0.07].map((x, index) => (
        <mesh key={x} position={[x, 0.16, 0.225]}>
          <cylinderGeometry args={[0.022, 0.022, 0.06, 10]} />
          <meshBasicMaterial color={index === 0 ? cyan : red} transparent opacity={0.82} />
        </mesh>
      ))}
      <mesh position={[0.24, -0.12, 0.03]}>
        <cylinderGeometry args={[0.045, 0.04, 0.26, 16]} />
        <meshStandardMaterial color="#f1f4f4" roughness={0.45} metalness={0.04} />
      </mesh>
      <mesh position={[0.24, 0.04, 0.03]}>
        <cylinderGeometry args={[0.047, 0.045, 0.02, 16]} />
        <meshBasicMaterial color="#f1f4f4" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function MaintenancePanel({
  position,
  rotation,
  mirror = false,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  mirror?: boolean;
}) {
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[0.5, 1.12, 0.04]} radius={0.025}>
        <meshStandardMaterial color="#07080a" roughness={0.5} metalness={0.48} />
      </RoundedBox>
      {Array.from({ length: 5 }).map((_, index) => (
        <mesh key={index} position={[0, 0.38 - index * 0.17, 0.035]}>
          <boxGeometry args={[0.36 - (index % 2) * 0.08, 0.018, 0.012]} />
          <meshBasicMaterial color={(index + (mirror ? 1 : 0)) % 2 ? cyan : red} transparent opacity={0.55} />
        </mesh>
      ))}
      <mesh position={[0.18, -0.42, 0.038]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshBasicMaterial color={mirror ? red : cyan} />
      </mesh>
    </group>
  );
}

function CeilingServiceGrid() {
  return (
    <group>
      <mesh position={[0, 4.105, -4.75]}>
        <boxGeometry args={[3.8, 0.028, 0.9]} />
        <meshStandardMaterial color="#050607" roughness={0.52} metalness={0.34} />
      </mesh>
      {Array.from({ length: 14 }).map((_, index) => (
        <mesh key={index} position={[-1.78 + index * 0.275, 4.08, -4.75]}>
          <boxGeometry args={[0.035, 0.018, 0.84]} />
          <meshBasicMaterial color="#2d333a" transparent opacity={0.48} />
        </mesh>
      ))}
      <mesh position={[0, 4.075, 0.9]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.65, 0.028, 8, 96]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0, 4.065, 0.9]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1.25, 0.012, 8, 96]} />
        <meshBasicMaterial color={red} transparent opacity={0.26} />
      </mesh>
    </group>
  );
}

function SafetyFloorMarks() {
  return (
    <group>
      {[-6.95, 6.95].map((x) => (
        <group key={x} position={[x, -0.972, 3.28]} rotation={[-Math.PI / 2, 0, x < 0 ? -0.18 : 0.18]}>
          {Array.from({ length: 7 }).map((_, index) => (
            <mesh key={index} position={[-0.42 + index * 0.14, 0, 0]}>
              <planeGeometry args={[0.09, 0.42]} />
              <meshBasicMaterial color={index % 2 ? "#101114" : "#e9eef0"} transparent opacity={0.38} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -0.97, 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.55, 1.58, 96]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.969, 2.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.07, 96]} />
        <meshBasicMaterial color={red} transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CareerHologram() {
  return (
    <group position={[-5.9, -0.92, -1.45]} rotation={[0, 0.38, 0]}>
      <RoundedBox args={[0.88, 0.16, 0.88]} radius={0.06} position={[0, 0.02, 0]}>
        <meshStandardMaterial color="#060708" roughness={0.34} metalness={0.64} />
      </RoundedBox>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.11, 0.16, 0.48, 28]} />
        <meshStandardMaterial color="#07090b" roughness={0.36} metalness={0.68} emissive="#041014" emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, 0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.36, 48]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.34} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.018, 0.035, 0.44, 16]} />
        <meshBasicMaterial color={cyan} transparent opacity={0.45} />
      </mesh>
      <Float speed={1.1} floatIntensity={0.16} rotationIntensity={0.28}>
        <group position={[0, 1.12, 0]}>
          <mesh>
            <sphereGeometry args={[0.36, 28, 18]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.12} wireframe />
          </mesh>
          {[0, Math.PI / 4, Math.PI / 2].map((angle) => (
            <mesh key={angle} rotation={[angle, angle * 0.35, 0]}>
              <torusGeometry args={[0.37, 0.004, 6, 72]} />
              <meshBasicMaterial color={cyan} transparent opacity={0.62} />
            </mesh>
          ))}
          <mesh rotation={[0, 0.6, 0]}>
            <torusGeometry args={[0.18, 0.003, 6, 48]} />
            <meshBasicMaterial color={red} transparent opacity={0.72} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

function WallMountedStatusBoards() {
  return (
    <group>
      {[
        { x: -8.02, y: 2.05, z: -1.72, r: Math.PI / 2, title: "VAGAS" },
        { x: 8.02, y: 2.12, z: -0.78, r: -Math.PI / 2, title: "ENVIO" },
      ].map((panel) => (
        <group key={panel.title} position={[panel.x, panel.y, panel.z]} rotation={[0, panel.r, 0]}>
          <RoundedBox args={[1.74, 1.04, 0.075]} radius={0.028} position={[0, 0, -0.045]}>
            <meshStandardMaterial color="#1d252e" roughness={0.46} metalness={0.36} emissive="#060a0e" emissiveIntensity={0.24} />
          </RoundedBox>
          <RoundedBox args={[1.58, 0.92, 0.04]} radius={0.025}>
            <meshStandardMaterial color="#071317" roughness={0.22} metalness={0.34} emissive={panel.title === "ENVIO" ? "#280808" : "#08232a"} emissiveIntensity={0.18} />
          </RoundedBox>
          <mesh position={[0, -0.62, -0.015]}>
            <boxGeometry args={[1.34, 0.05, 0.055]} />
            <meshStandardMaterial color="#08090b" roughness={0.38} metalness={0.62} />
          </mesh>
          <mesh position={[0, 0.6, -0.015]}>
            <boxGeometry args={[1.34, 0.035, 0.04]} />
            <meshBasicMaterial color={panel.title === "ENVIO" ? red : cyan} transparent opacity={0.38} />
          </mesh>
          <Text position={[-0.64, 0.3, 0.035]} fontSize={0.08} color={red} anchorX="left">
            {panel.title}
          </Text>
          {[0, 1, 2].map((row) => (
            <Line
              key={row}
              points={[
                [-0.6, 0.1 - row * 0.22, 0.04],
                [0.52 - row * 0.12, 0.1 - row * 0.22, 0.04],
              ]}
              color={row % 2 ? cyan : red}
              lineWidth={1.2}
              transparent
              opacity={0.72}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

function CableRuns() {
  return (
    <group>
      {[-4.85, -1.65, 1.65, 4.85].map((x, index) => (
        <Line
          key={x}
          points={[
            [x + 0.78, -0.98, 0.42],
            [x + 0.4, -1.0, -0.2],
            [x * 0.62, -1.0, -1.65 - index * 0.2],
          ]}
          color={index % 2 ? "#111418" : "#230809"}
          lineWidth={1.4}
          transparent
          opacity={0.82}
        />
      ))}
    </group>
  );
}

function ReceptionPedestal() {
  return (
    <group position={[0, -0.48, 3.25]}>
      <RoundedBox args={[1.5, 0.72, 0.48]} radius={0.055}>
        <meshStandardMaterial color="#070607" roughness={0.42} metalness={0.54} />
      </RoundedBox>
      <Text position={[-0.46, 0.05, 0.26]} fontSize={0.12} color="#f3f0ea" anchorX="left">
        Vitaey
      </Text>
      <mesh position={[0, -0.12, 0.27]}>
        <boxGeometry args={[1.05, 0.018, 0.018]} />
        <meshBasicMaterial color={red} transparent opacity={0.74} />
      </mesh>
    </group>
  );
}

function PlantCluster({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.42, 0.38, 0.42]} radius={0.07} position={[0, -0.22, 0]}>
        <meshStandardMaterial color="#161111" roughness={0.52} metalness={0.22} />
      </RoundedBox>
      {Array.from({ length: 7 }).map((_, index) => {
        const angle = (index / 7) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.16, 0.2 + Math.sin(index) * 0.08, Math.sin(angle) * 0.16]} rotation={[0.8, angle, 0.3]}>
            <coneGeometry args={[0.08, 0.56, 8]} />
            <meshStandardMaterial color={index % 2 ? "#162f2c" : "#203a32"} roughness={0.7} metalness={0.03} />
          </mesh>
        );
      })}
    </group>
  );
}

function makeScreenTexture(variant: string, title = "VITAEY", metric?: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createRadialGradient(740, 120, 20, 760, 130, 700);
  gradient.addColorStop(0, "rgba(255,42,42,0.22)");
  gradient.addColorStop(0.45, "rgba(20,30,34,0.55)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,42,42,0.18)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = red;
  ctx.font = "700 34px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText(title.toUpperCase(), 54, 66);
  const headline =
    variant === "radar"
      ? "RADAR"
      : variant === "pipeline"
        ? "PIPELINE"
        : variant === "curriculo"
          ? "CURRICULO"
          : variant === "perfil"
            ? "PERFIL"
            : variant === "integracoes"
              ? "INTEGRACOES"
              : variant === "sobre"
                ? "SOBRE"
            : "MATCH";
  ctx.fillStyle = "#f3f0ea";
  ctx.font = headline.length > 10 ? "700 48px Georgia" : headline.length > 7 ? "700 58px Georgia" : "700 74px Georgia";
  ctx.fillText(headline, 54, 152);

  drawScreenVariant(ctx, variant, metric);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function drawScreenVariant(ctx: CanvasRenderingContext2D, variant: string, metric?: string) {
  ctx.lineWidth = 3;
  if (variant === "pipeline") {
    ["SALVA", "REVISA", "ENVIA", "ENTREV", "OFERTA"].forEach((label, index) => {
      const x = 66 + index * 180;
      ctx.strokeStyle = "rgba(255,42,42,0.65)";
      ctx.strokeRect(x, 225, 130, 210);
      ctx.fillStyle = index % 2 ? "rgba(107,231,255,0.78)" : "rgba(255,42,42,0.78)";
      ctx.beginPath();
      ctx.arc(x + 64, 270 + index * 24, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff2a2a";
      ctx.font = "700 18px Arial";
      ctx.fillText(label, x + 18, 470);
    });
    return;
  }

  if (variant === "curriculo") {
    for (let index = 0; index < 5; index += 1) {
      const y = 230 + index * 54;
      ctx.fillStyle = index % 2 ? "rgba(255,42,42,0.25)" : "rgba(107,231,255,0.18)";
      ctx.fillRect(72, y, 600 - index * 48, 22);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.strokeRect(70, y - 10, 760, 42);
    }
    ctx.strokeStyle = red;
    ctx.beginPath();
    ctx.arc(842, 316, 82, -Math.PI * 0.35, Math.PI * 1.35);
    ctx.stroke();
    ctx.fillStyle = "#f3f0ea";
    ctx.font = metric && metric.length > 4 ? "700 32px Arial" : "700 54px Georgia";
    ctx.fillText(metric ?? "SEM MATCH", metric && metric.length > 4 ? 752 : 790, 334);
    return;
  }

  if (variant === "perfil") {
    ctx.strokeStyle = "rgba(107,231,255,0.55)";
    ctx.beginPath();
    ctx.arc(170, 302, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,42,42,0.62)";
    ctx.fillRect(270, 250, 520, 24);
    ctx.fillStyle = "rgba(107,231,255,0.38)";
    ctx.fillRect(270, 310, 440, 20);
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(270, 366, 610, 18);
    ["SKILLS", "SALARIO", "LOCAL", "SENIORIDADE"].forEach((label, index) => {
      const x = 74 + index * 220;
      ctx.strokeStyle = index % 2 ? "rgba(107,231,255,0.52)" : "rgba(255,42,42,0.58)";
      ctx.strokeRect(x, 448, 164, 42);
      ctx.fillStyle = "#f3f0ea";
      ctx.font = "700 16px Arial";
      ctx.fillText(label, x + 18, 476);
    });
    return;
  }

  if (variant === "integracoes") {
    ["LINKEDIN", "PORTFOLIO", "GITHUB", "SITE"].forEach((label, index) => {
      const y = 230 + index * 72;
      ctx.strokeStyle = index % 2 ? "rgba(107,231,255,0.55)" : "rgba(255,42,42,0.65)";
      ctx.strokeRect(72, y, 780, 44);
      ctx.fillStyle = "#f3f0ea";
      ctx.font = "700 22px Arial";
      ctx.fillText(label, 98, y + 30);
      ctx.fillStyle = index % 2 ? "rgba(107,231,255,0.34)" : "rgba(255,42,42,0.34)";
      ctx.fillRect(320, y + 15, 450 - index * 52, 10);
      ctx.beginPath();
      ctx.arc(870, y + 22, 14, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  if (variant === "sobre") {
    ["PRIVACIDADE", "TERMOS", "SOBRE NOS", "SEGURANCA"].forEach((label, index) => {
      const x = 78 + (index % 2) * 430;
      const y = 240 + Math.floor(index / 2) * 122;
      ctx.strokeStyle = index % 2 ? "rgba(107,231,255,0.52)" : "rgba(255,42,42,0.58)";
      ctx.strokeRect(x, y, 350, 82);
      ctx.fillStyle = "#f3f0ea";
      ctx.font = "700 20px Arial";
      ctx.fillText(label, x + 28, y + 38);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 28, y + 54, 210, 8);
    });
    return;
  }

  for (let index = 0; index < 6; index += 1) {
    const x = 72 + index * 135;
    const h = 82 + Math.sin(index * 1.7) * 42 + index * 10;
    ctx.fillStyle = index % 2 ? "rgba(107,231,255,0.6)" : "rgba(255,42,42,0.7)";
    ctx.fillRect(x, 428 - h, 58, h);
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(x, 448, 70, 4);
  }
  ctx.strokeStyle = "rgba(255,42,42,0.82)";
  ctx.beginPath();
  ctx.moveTo(70, 356);
  for (let index = 0; index < 8; index += 1) {
    ctx.lineTo(70 + index * 108, 342 - Math.sin(index * 1.35) * 58);
  }
  ctx.stroke();
}

function makeFloorTexture() {
  const texture = makeNoiseTexture("#111216", "#242024", 0.13);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

function makeWallTexture() {
  const texture = makeNoiseTexture("#050506", "#17191d", 0.12);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

function makeCarpetTexture() {
  const texture = makeNoiseTexture("#190708", "#381113", 0.2);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 7);
  return texture;
}

function makeDeskTexture() {
  const texture = makeNoiseTexture("#151011", "#312022", 0.18);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 1);
  return texture;
}

function makeFabricTexture() {
  const texture = makeNoiseTexture("#101114", "#262a2e", 0.22);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

function makeNoiseTexture(base: string, accent: string, alpha: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let index = 0; index < 1800; index += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? accent : "rgba(255,255,255,0.08)";
    ctx.globalAlpha = Math.random() * alpha;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function interpolateCamera(path: Array<{ p: number; camera: THREE.Vector3; target: THREE.Vector3 }>, progress: number) {
  let from = path[0];
  let to = path[path.length - 1];
  for (let index = 0; index < path.length - 1; index += 1) {
    if (progress >= path[index].p && progress <= path[index + 1].p) {
      from = path[index];
      to = path[index + 1];
      break;
    }
  }
  const local = to.p === from.p ? 0 : (progress - from.p) / (to.p - from.p);
  return {
    camera: new THREE.Vector3(
      gsap.utils.interpolate(from.camera.x, to.camera.x, local),
      gsap.utils.interpolate(from.camera.y, to.camera.y, local),
      gsap.utils.interpolate(from.camera.z, to.camera.z, local),
    ),
    target: new THREE.Vector3(
      gsap.utils.interpolate(from.target.x, to.target.x, local),
      gsap.utils.interpolate(from.target.y, to.target.y, local),
      gsap.utils.interpolate(from.target.z, to.target.z, local),
    ),
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function useCompactScene() {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 700px)").matches;
  });

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const widthQuery = window.matchMedia("(max-width: 700px)");
    const update = () => setCompact(motionQuery.matches || widthQuery.matches);
    update();
    motionQuery.addEventListener("change", update);
    widthQuery.addEventListener("change", update);
    return () => {
      motionQuery.removeEventListener("change", update);
      widthQuery.removeEventListener("change", update);
    };
  }, []);

  return compact;
}
