import AnimatedTitle from "./AnimatedTitle";
import Button from "./Button";

const ImageClipBox = ({ src, clipClass }) => (
  <div className={clipClass}>
    <img src={src} />
  </div>
);

const Footer = () => {
  return (
    <footer id="contact" className="my-10 min-h-96 w-full overflow-hidden px-4 sm:px-10">
      <div className="relative rounded-lg bg-black py-24 text-[#dfdff2] sm:overflow-hidden">
        <div className="absolute -left-20 top-0 hidden h-full w-72 overflow-hidden sm:block lg:left-20 lg:w-96">
          <ImageClipBox
            src="img/contact-1.webp"
            clipClass="contact-clip-path-1"
          />
          <ImageClipBox
            src="img/contact-2.webp"
            clipClass="contact-clip-path-2 lg:translate-y-40 translate-y-60"
          />
        </div>

        <div className="absolute -top-40 left-20 w-60 sm:top-1/2 md:left-auto md:right-10 lg:top-20 lg:w-80">
          <ImageClipBox
            src="img/swordman-partial.webp"
            clipClass="absolute md:scale-125"
          />
          <ImageClipBox
            src="img/swordman.webp"
            clipClass="sword-man-clip-path md:scale-125"
          />
        </div>

        <div className="flex flex-col items-center text-center px-4">
          <p className="mb-10 font-general text-xs tracking-widest uppercase text-yellow-300">
            Join AOVS Today
          </p>

          <AnimatedTitle
            title="let&#39;s b<b>u</b>ild the <br /> new era of assess<b>m</b>ent <br /> t<b>o</b>gether."
            className="special-font !md:text-[6.2rem] w-full font-zentry !text-5xl !font-black !leading-[.9]"
          />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              id="footer-student-login"
              title="Student Login"
              href="/Student Login/Creating Login_UI/index.html"
              containerClass="bg-yellow-300 font-bold text-black hover:bg-yellow-400"
            />
            <Button
              id="footer-contact"
              title="Contact Us"
              href="mailto:admissions@aovs.edu"
              containerClass="bg-white/10 text-white border border-white/20 hover:bg-white/20"
            />
          </div>
        </div>

        <div className="mt-20 border-t border-white/10 pt-8 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 font-general gap-4">
          <p>© 2026 AOVS — Online Assessment &amp; Verification System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#about" className="hover:text-white transition">About</a>
            <a href="#story" className="hover:text-white transition">Security</a>
            <a href="/Student Login/Creating Login_UI/index.html" className="text-yellow-300 hover:underline">Student Portal</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;