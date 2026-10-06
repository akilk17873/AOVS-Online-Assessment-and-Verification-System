import clsx from "clsx";
import gsap from "gsap";
import { useWindowScroll } from "react-use";
import { useEffect, useRef, useState } from "react";
import { TiLocationArrow } from "react-icons/ti";

import Button from "./Button";

const navItems = ["Features", "About", "Story", "Contact"];

const NavBar = () => {
  // State for toggling audio and visual indicator
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);

  // Refs for audio and navigation container
  const audioElementRef = useRef(null);
  const navContainerRef = useRef(null);

  const { y: currentScrollY } = useWindowScroll();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Toggle audio and visual indicator
  const toggleAudioIndicator = () => {
    setIsAudioPlaying((prev) => !prev);
    setIsIndicatorActive((prev) => !prev);
  };

  useEffect(() => {
    if (isAudioPlaying && audioElementRef.current) {
      audioElementRef.current.play().catch(() => {});
    }
  }, []);

  // Manage audio playback
  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaying) {
        audioElementRef.current.play().catch(() => {});
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    if (currentScrollY === 0) {
      // Topmost position: show navbar without floating-nav
      setIsNavVisible(true);
      navContainerRef.current?.classList.remove("floating-nav");
    } else if (currentScrollY > lastScrollY) {
      // Scrolling down: hide navbar and apply floating-nav
      setIsNavVisible(false);
      navContainerRef.current?.classList.add("floating-nav");
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up: show navbar with floating-nav
      setIsNavVisible(true);
      navContainerRef.current?.classList.add("floating-nav");
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY]);

  useEffect(() => {
    if (navContainerRef.current) {
      gsap.to(navContainerRef.current, {
        y: isNavVisible ? 0 : -100,
        opacity: isNavVisible ? 1 : 0,
        duration: 0.2,
      });
    }
  }, [isNavVisible]);

  return (
    <div
      ref={navContainerRef}
      className="fixed inset-x-0 top-4 z-50 h-16 border-none transition-all duration-700 sm:inset-x-6"
    >
      <header className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between p-4">
          {/* Logo and Product button */}
          <div className="flex items-center gap-4 sm:gap-7">
            <a href="#" className="flex items-center gap-2">
              <img src="img/logo.png" alt="AOVS logo" className="w-9" />
              <span className="font-zentry text-2xl tracking-wider text-[#dfdff2] uppercase">AOVS</span>
            </a>

            <Button
              id="student-login-btn"
              title="Student Login"
              href="/Student Login/Creating Login_UI/index.html"
              rightIcon={<TiLocationArrow />}
              containerClass="bg-[#edff66] md:flex hidden items-center justify-center gap-1 font-semibold text-black hover:bg-yellow-300"
            />

            <Button
              id="exam-portal-btn"
              title="Exam Portal"
              href="/Exam/index.html"
              rightIcon={<TiLocationArrow />}
              containerClass="bg-[#06b6d4] md:flex hidden items-center justify-center gap-1 font-semibold text-black hover:bg-cyan-300"
            />
          </div>

          {/* Navigation Links and Audio Button */}
          <div className="flex h-full items-center">
            <div className="hidden md:flex items-center">
              {navItems.map((item, index) => (
                <a
                  key={index}
                  href={`#${item.toLowerCase()}`}
                  className="nav-hover-btn"
                >
                  {item}
                </a>
              ))}
            </div>

            <Button
              id="student-login-mobile"
              title="Login"
              href="/Student Login/Creating Login_UI/index.html"
              rightIcon={<TiLocationArrow />}
              containerClass="bg-[#edff66] md:hidden flex items-center justify-center gap-1 text-xs py-1.5 px-3 font-semibold text-black"
            />

            <Button
              id="exam-portal-mobile"
              title="Exam"
              href="/Exam/index.html"
              rightIcon={<TiLocationArrow />}
              containerClass="bg-[#06b6d4] md:hidden flex items-center justify-center gap-1 text-xs py-1.5 px-3 font-semibold text-black ml-1"
            />

            <button
              onClick={toggleAudioIndicator}
              className="ml-5 md:ml-10 flex items-center space-x-0.5 cursor-pointer"
              title="Toggle Background Audio"
            >
              <audio
                ref={audioElementRef}
                className="hidden"
                src="audio/loop.mp3"
                loop
              />
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={clsx("indicator-line", {
                    active: isIndicatorActive,
                  })}
                  style={{
                    animationDelay: `${bar * 0.1}s`,
                  }}
                />
              ))}
            </button>
          </div>
        </nav>
      </header>
    </div>
  );
};

export default NavBar;