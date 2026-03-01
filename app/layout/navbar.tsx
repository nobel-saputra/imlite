"use client";

import React from "react";
import Image from "next/image"


const Navbar: React.FC = () => {
  return (
    <header className="w-full px-4 lg:px-20 py-6 ">
      <div className="logo">
      <Image src="/logo.png" alt="Logo" width={90} height={90} />
      </div>
    </header>
  );
};

export default Navbar;
