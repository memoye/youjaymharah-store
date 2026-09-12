import React from "react"

import { IconProps } from "types/icon"

type HeartProps = IconProps & {
  /** Solid heart for a saved item, outline otherwise. */
  filled?: boolean
}

const Heart: React.FC<HeartProps> = ({
  size = "16",
  color = "currentColor",
  filled = false,
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        d="M10 17C10 17 2.5 12.6 2.5 7.4C2.5 5.2 4.2 3.5 6.3 3.5C7.8 3.5 9.2 4.4 10 5.7C10.8 4.4 12.2 3.5 13.7 3.5C15.8 3.5 17.5 5.2 17.5 7.4C17.5 12.6 10 17 10 17Z"
        stroke={color}
        fill={filled ? color : "none"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default Heart
