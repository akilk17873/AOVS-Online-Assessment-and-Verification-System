import { useState, useRef } from "react";
import { TiLocationArrow } from "react-icons/ti";

export const BentoTilt = ({ children, className = "" }) => {
  const [transformStyle, setTransformStyle] = useState("");
  const itemRef = useRef(null);

  const handleMouseMove = (event) => {
    if (!itemRef.current) return;

    const { left, top, width, height } =
      itemRef.current.getBoundingClientRect();

    const relativeX = (event.clientX - left) / width;
    const relativeY = (event.clientY - top) / height;

    const tiltX = (relativeY - 0.5) * 5;
    const tiltY = (relativeX - 0.5) * -5;

    const newTransform = `perspective(700px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(.95, .95, .95)`;
    setTransformStyle(newTransform);
  };

  const handleMouseLeave = () => {
    setTransformStyle("");
  };

  return (
    <div
      ref={itemRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: transformStyle }}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({ src, title, description }) => {
  const isVideo = src?.endsWith(".mp4");

  return (
    <div className="relative size-full overflow-hidden group">
      {isVideo ? (
        <video
          src={src}
          loop
          muted
          autoPlay
          className="absolute left-0 top-0 size-full object-cover object-center"
        />
      ) : (
        <img
          src={src}
          alt=""
          className="absolute left-0 top-0 size-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />
      )}

      {/* Dark gradient overlay for pristine text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none" />

      <div className="relative z-10 flex size-full flex-col justify-between p-5 text-[#dfdff2]">
        <div>
          <h1 className="bento-title special-font drop-shadow-md">{title}</h1>
          {description && (
            <p className="mt-3 max-w-64 text-xs md:text-base text-gray-200 drop-shadow">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Features = () => (
  <section id="features" className="bg-black pb-52">
    <div className="container mx-auto px-3 md:px-10">
      <div className="px-5 py-32">
        <p className="font-circular-web text-lg text-[#dfdff2]">
          The Intelligence &amp; Verification Layer
        </p>
        <p className="max-w-md font-circular-web text-lg text-[#dfdff2] opacity-50">
          Empower your educational ecosystem with automated online testing,
          verifiable credentials, and tamper-resistant examination evaluation.
        </p>
      </div>

      <BentoTilt className="bento-tilt_1 relative mb-7 h-96 w-full overflow-hidden rounded-md md:h-[65vh]">
        <BentoCard
          src="img/card-assessment.webp"
          title={
            <>
              assess<b>m</b>ent
            </>
          }
          description="Next-generation online examination platform with automated scheduling, secure test environments, and comprehensive multi-format evaluations."
        />
      </BentoTilt>

      <div className="grid h-[135vh] w-full grid-cols-2 grid-rows-3 gap-7">
        <BentoTilt className="bento-tilt_1 row-span-1 md:col-span-1 md:row-span-2">
          <BentoCard
            src="img/card-verification.webp"
            title={
              <>
                verifi<b>c</b>ation
              </>
            }
            description="Tamper-proof cryptographic validation for test scores, student transcripts, and academic credentials."
          />
        </BentoTilt>

        <BentoTilt className="bento-tilt_1 row-span-1 ms-32 md:col-span-1 md:ms-0">
          <BentoCard
            src="img/card-student-hub.webp"
            title={
              <>
                st<b>u</b>dent hub
              </>
            }
            description="Interactive portal for real-time exam schedules, instant mock assessments, and verified result downloads."
          />
        </BentoTilt>

        <BentoTilt className="bento-tilt_1 me-14 md:col-span-1 md:me-0">
          <BentoCard
            src="img/card-analytics.webp"
            title={
              <>
                an<b>a</b>lytics
              </>
            }
            description="Deep neural scoring engines for automated evaluation of both subjective essays and coding submissions."
          />
        </BentoTilt>

        <BentoTilt className="bento-tilt_2">
          <a
            href="/Student Login/Creating Login_UI/index.html"
            className="flex size-full flex-col justify-between bg-yellow-300 hover:bg-yellow-400 p-5 transition-colors group cursor-pointer"
          >
            <h1 className="bento-title special-font max-w-56 text-black">
              St<b>u</b>dent L<b>o</b>gin.
            </h1>

            <div className="flex items-center gap-2 text-black font-general text-xs uppercase tracking-wider font-semibold">
              <span>Enter Portal</span>
              <TiLocationArrow className="scale-125 transition-transform group-hover:translate-x-1" />
            </div>
          </a>
        </BentoTilt>

        <BentoTilt className="bento-tilt_2">
          <img
            src="img/card-security.webp"
            alt="Cryptographic Security"
            className="size-full object-cover object-center"
          />
        </BentoTilt>
      </div>
    </div>
  </section>
);

export default Features;