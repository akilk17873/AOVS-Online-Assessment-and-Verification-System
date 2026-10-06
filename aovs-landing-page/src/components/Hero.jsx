import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import { TiLocationArrow } from "react-icons/ti";
import { useEffect, useRef, useState } from "react";

import Button from "./Button";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  const handleVideoLoad = () => {
    setLoading(false);
  };

  useGSAP(() => {
    gsap.set("#video-frame", {
      clipPath: "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
      borderRadius: "0% 0% 40% 10%",
    });
    gsap.from("#video-frame", {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      borderRadius: "0% 0% 0% 0%",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: "#video-frame",
        start: "center center",
        end: "bottom center",
        scrub: true,
      },
    });
  });

  return (
    <div className="relative h-dvh w-full overflow-x-hidden">
      {loading && (
        <div className="flex-center absolute z-[100] h-dvh w-full overflow-hidden bg-violet-50">
          <div className="three-body">
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        </div>
      )}

      <div
        id="video-frame"
        className="relative z-10 h-dvh w-full overflow-hidden rounded-lg bg-black"
      >
        <video
          ref={videoRef}
          src="videos/hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute left-0 top-0 size-full object-cover object-center"
          onLoadedData={handleVideoLoad}
          onCanPlay={handleVideoLoad}
        />

        <div className="absolute inset-0 bg-black/40 pointer-events-none z-20" />

        <h1 className="special-font hero-heading absolute bottom-5 right-5 z-40 text-[#dfdff2]">
          A<b>O</b>VS
        </h1>

        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="mt-24 px-5 sm:px-10">
            <h1 className="special-font hero-heading text-[#dfdff2]">
              redefi<b>n</b>e
            </h1>

            <p className="mb-5 max-w-72 font-robert-regular text-[#dfdff2] text-sm sm:text-base">
              Online Assessment &amp; Verification System <br />
              Secure, Automated &amp; Tamper-Proof Testing
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                id="hero-student-login"
                title="Student Login"
                href="/Student Login/Creating Login_UI/index.html"
                leftIcon={<TiLocationArrow />}
                containerClass="bg-yellow-300 flex-center gap-1 font-bold text-black hover:bg-yellow-400"
              />
              <Button
                id="explore-btn"
                title="Explore Platform"
                href="#features"
                containerClass="bg-white/15 text-white backdrop-blur border border-white/20 flex-center gap-1 hover:bg-white/25"
              />
            </div>
          </div>
        </div>
      </div>

      <h1 className="special-font hero-heading absolute bottom-5 right-5 text-black">
        A<b>O</b>VS
      </h1>
    </div>
  );
};

export default Hero;