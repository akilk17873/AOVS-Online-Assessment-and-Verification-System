import clsx from "clsx";

const Button = ({ id, title, rightIcon, leftIcon, containerClass, href, onClick }) => {
  const content = (
    <>
      {leftIcon}

      <span className="relative inline-flex overflow-hidden font-general text-xs uppercase">
        <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
          {title}
        </div>
        <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
          {title}
        </div>
      </span>

      {rightIcon}
    </>
  );

  const classes = clsx(
    "group relative z-10 w-fit cursor-pointer overflow-hidden rounded-full bg-[#dfdff2] px-7 py-3 text-black",
    containerClass
  );

  if (href) {
    return (
      <a id={id} href={href} className={classes} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <button id={id} className={classes} onClick={onClick}>
      {content}
    </button>
  );
};

export default Button;