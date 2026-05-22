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
  const deskTexture = useMemo(() => makeDeskTexture(), []);
  const fabricTexture = useMemo(() => makeFabricTexture(), []);
  const cameraPath = useMemo(
    () => [
      { p: 0, camera: new THREE.Vector3(0, 2.9, 12.2), target: new THREE.Vector3(0, 0.72, -2.15) },
      { p: 0.25, camera: new THREE.Vector3(-5.45, 2.08, 5.0), target: new THREE.Vector3(-1.4, 0.35, -1.9) },
      { p: 0.54, camera: new THREE.Vector3(-0.4, 2.0, 4.75), target: new THREE.Vector3(-3.45, 0.55, -2.45) },
      { p: 0.78, camera: new THREE.Vector3(5.35, 2.1, 4.15), target: new THREE.Vector3(4.0, 0.38, -2.55) },
      { p: 1, camera: new THREE.Vector3(0, 2.55, 9.75), target: new THREE.Vector3(0, 0.2, -2.3) },
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
      <ambientLight intensity={0.24} color="#9fb5c5" />
      <directionalLight position={[-5, 8, 7]} intensity={1.55} color="#b6e8ff" />
      <pointLight position={[4.8, 2.4, -1.5]} intensity={28} distance={16} color={red} />
      <pointLight position={[-5.7, 3.0, -4.2]} intensity={15} distance={16} color={cyan} />

      <OfficeShell floorTexture={floorTexture} />
      <CeilingSystem />
      <MeetingZone deskTexture={deskTexture} fabricTexture={fabricTexture} />
      <DeskCluster deskTexture={deskTexture} fabricTexture={fabricTexture} compact={compact} />
      <WallDashboard signalScore={signalScore} />
      <ResumeScanner />
      <PipelineWall />
      {!compact ? <ServerRack /> : null}
      {!compact ? <PlantCluster position={[-6.9, -0.52, -4.9]} /> : null}
      {!compact ? <PlantCluster position={[6.5, -0.52, -4.7]} /> : null}

      <Line points={curvePoints} color={red} lineWidth={1.1} transparent opacity={0.66} />
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color={red} size={0.032} transparent opacity={0.58} depthWrite={false} />
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

function OfficeShell({ floorTexture }: { floorTexture: THREE.Texture }) {
  return (
    <group>
      <mesh position={[0, -1.08, -1.15]} receiveShadow>
        <boxGeometry args={[18, 0.08, 22]} />
        <meshStandardMaterial map={floorTexture} color="#121317" roughness={0.62} metalness={0.18} />
      </mesh>
      <mesh position={[0, 4.22, -1.15]}>
        <boxGeometry args={[18, 0.08, 22]} />
        <meshStandardMaterial color="#050506" roughness={0.72} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.5, -8.2]}>
        <boxGeometry args={[18, 5.25, 0.08]} />
        <meshStandardMaterial color="#050506" roughness={0.74} metalness={0.26} />
      </mesh>
      {[-8.22, 8.22].map((x) => (
        <mesh key={x} position={[x, 1.5, -1.15]}>
          <boxGeometry args={[0.08, 5.25, 22]} />
          <meshStandardMaterial color="#050506" roughness={0.74} metalness={0.26} />
        </mesh>
      ))}
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
    </group>
  );
}

function CeilingSystem() {
  return (
    <group>
      {[-5.6, -1.85, 1.85, 5.6].map((x, index) => (
        <group key={x} position={[x, 3.92, -2.2 + (index % 2) * 0.6]}>
          <mesh>
            <boxGeometry args={[1.65, 0.035, 0.14]} />
            <meshBasicMaterial color={cyan} transparent opacity={0.72} />
          </mesh>
          <pointLight color={cyan} intensity={index % 2 ? 4.5 : 3.4} distance={5.5} />
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
      <RoundedBox args={[5.6, 0.18, 1.62]} radius={0.06} position={[0, -0.62, 0.78]}>
        <meshStandardMaterial map={deskTexture} color="#161212" roughness={0.44} metalness={0.32} />
      </RoundedBox>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[4.75, 1.95, 0.045]} />
        <meshPhysicalMaterial color="#0b1418" roughness={0.15} metalness={0.05} transparent opacity={0.25} transmission={0.45} />
      </mesh>
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
          rotation={[0, Math.PI + (index % 2 ? -0.16 : 0.16), 0]}
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
    { x: 4.85, z: 0.85, rotate: -0.08, screen: "perfil" },
  ];
  const visibleDesks = compact ? desks.slice(1, 3) : desks;

  return (
    <group>
      {visibleDesks.map((desk, index) => (
        <group key={desk.x} position={[desk.x, 0, desk.z]} rotation={[0, desk.rotate, 0]}>
          <OfficeDesk deskTexture={deskTexture} screen={desk.screen} />
          <OfficeChair position={[0, -0.62, 1.22]} rotation={[0, Math.PI, 0]} fabricTexture={fabricTexture} />
          <CpuTower position={[0.93, -0.44, -0.3]} />
          {index % 2 === 0 ? <DeskLamp position={[-0.78, -0.34, -0.2]} /> : <DocumentTray position={[-0.8, -0.58, 0.28]} />}
        </group>
      ))}
    </group>
  );
}

function OfficeDesk({ deskTexture, screen }: { deskTexture: THREE.Texture; screen: string }) {
  return (
    <group>
      <RoundedBox args={[2.35, 0.16, 1.28]} radius={0.04} position={[0, -0.7, 0]}>
        <meshStandardMaterial map={deskTexture} color="#171212" roughness={0.42} metalness={0.36} />
      </RoundedBox>
      {[-0.92, 0.92].flatMap((x) =>
        [-0.46, 0.46].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, -0.23, z]}>
            <cylinderGeometry args={[0.045, 0.06, 0.9, 8]} />
            <meshStandardMaterial color="#060607" roughness={0.7} metalness={0.34} />
          </mesh>
        )),
      )}
      <Monitor position={[0, 0.04, -0.43]} variant={screen} />
      <Keyboard position={[0, -0.59, 0.16]} />
      <Mouse position={[0.62, -0.58, 0.18]} />
      <Laptop position={[-0.66, -0.57, 0.22]} variant={screen === "pipeline" ? "radar" : "pipeline"} />
    </group>
  );
}

function Monitor({ position, variant }: { position: [number, number, number]; variant: string }) {
  const texture = useMemo(() => makeScreenTexture(variant), [variant]);
  return (
    <group position={position}>
      <RoundedBox args={[1.12, 0.72, 0.055]} radius={0.035} smoothness={8}>
        <meshStandardMaterial color="#050506" roughness={0.34} metalness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0, 0.038]}>
        <planeGeometry args={[1.0, 0.58]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.46, 0]}>
        <boxGeometry args={[0.08, 0.34, 0.05]} />
        <meshStandardMaterial color="#050506" roughness={0.48} metalness={0.7} />
      </mesh>
      <RoundedBox args={[0.48, 0.045, 0.3]} radius={0.03} position={[0, -0.63, 0.02]}>
        <meshStandardMaterial color="#060607" roughness={0.5} metalness={0.58} />
      </RoundedBox>
    </group>
  );
}

function Laptop({ position, variant }: { position: [number, number, number]; variant: string }) {
  const texture = useMemo(() => makeScreenTexture(variant), [variant]);
  return (
    <group position={position} rotation={[-0.04, 0.05, 0]}>
      <RoundedBox args={[0.62, 0.035, 0.43]} radius={0.025}>
        <meshStandardMaterial color="#060607" roughness={0.44} metalness={0.62} />
      </RoundedBox>
      <group position={[0, 0.2, -0.21]} rotation={[-0.9, 0, 0]}>
        <RoundedBox args={[0.62, 0.38, 0.035]} radius={0.025}>
          <meshStandardMaterial color="#050506" roughness={0.38} metalness={0.64} />
        </RoundedBox>
        <mesh position={[0, 0, 0.023]}>
          <planeGeometry args={[0.53, 0.3]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
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
      <RoundedBox args={[0.72, 0.16, 0.68]} radius={0.12} position={[0, 0.16, 0]}>
        <meshStandardMaterial map={fabricTexture} color="#111215" roughness={0.72} metalness={0.04} />
      </RoundedBox>
      <RoundedBox args={[0.72, 0.86, 0.15]} radius={0.12} position={[0, 0.68, 0.32]} rotation={[-0.16, 0, 0]}>
        <meshStandardMaterial map={fabricTexture} color="#101114" roughness={0.76} metalness={0.04} />
      </RoundedBox>
      {[-0.45, 0.45].map((x) => (
        <RoundedBox key={x} args={[0.09, 0.08, 0.55]} radius={0.04} position={[x, 0.33, -0.02]}>
          <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.55} />
        </RoundedBox>
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
    <RoundedBox args={[0.26, 0.62, 0.4]} radius={0.045} position={position}>
      <meshStandardMaterial color="#050506" roughness={0.42} metalness={0.62} />
      <meshBasicMaterial attach="material-0" color="#050506" />
    </RoundedBox>
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
  return (
    <group position={[-5.95, 1.48, -4.4]} rotation={[0, 0.58, 0]}>
      <PresentationScreen width={3.15} height={1.8} title="CURRICULO SCORE" variant="curriculo" />
      <mesh position={[0, -1.12, 0.02]}>
        <torusGeometry args={[0.55 + signalScore / 360, 0.012, 10, 120]} />
        <meshBasicMaterial color={red} transparent opacity={0.42} wireframe />
      </mesh>
      <Text position={[-0.45, -1.15, 0.05]} fontSize={0.18} color="#fff" anchorX="left">
        {signalScore}%
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
}: {
  width: number;
  height: number;
  title: string;
  variant: string;
  position?: [number, number, number];
}) {
  const texture = useMemo(() => makeScreenTexture(variant, title), [variant, title]);
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
    <group position={[3.45, 0.25, -2.5]} rotation={[0, -0.42, 0]}>
      {["SALVA", "REVISA", "ENVIA", "ENTREV", "OFERTA"].map((label, index) => (
        <group key={label} position={[index * 0.68, 0, 0]}>
          <RoundedBox args={[0.52, 1.75, 0.045]} radius={0.025}>
            <meshPhysicalMaterial color="#0a1114" transparent opacity={0.34} roughness={0.18} transmission={0.32} />
          </RoundedBox>
          <mesh position={[0, 0.78 - index * 0.24, 0.08]}>
            <sphereGeometry args={[0.075 + index * 0.006, 18, 18]} />
            <meshStandardMaterial color={index % 2 ? cyan : red} emissive={index % 2 ? cyan : red} emissiveIntensity={1.2} />
          </mesh>
          <Text position={[-0.21, -0.96, 0.08]} fontSize={0.065} color={red} anchorX="left">
            {label}
          </Text>
        </group>
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

function makeScreenTexture(variant: string, title = "VITAEY") {
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
  ctx.fillStyle = "#f3f0ea";
  ctx.font = "700 74px Georgia";
  ctx.fillText(variant === "radar" ? "RADAR" : variant === "pipeline" ? "PIPELINE" : "MATCH", 54, 152);

  drawScreenVariant(ctx, variant);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function drawScreenVariant(ctx: CanvasRenderingContext2D, variant: string) {
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
    ctx.font = "700 54px Georgia";
    ctx.fillText("95%", 790, 334);
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
  const [reduced, setReduced] = useState(false);

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
  const [compact, setCompact] = useState(false);

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
