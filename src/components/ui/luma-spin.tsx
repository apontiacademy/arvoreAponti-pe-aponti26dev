import { cn } from "@/lib/utils"

function LumaSpin({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="luma-spin"
      className={cn("relative aspect-square w-16", className)}
      {...props}
    >
      <span className="absolute animate-luma-spin rounded-[50px] shadow-[inset_0_0_0_3px] shadow-primary" />
      <span className="absolute animate-luma-spin rounded-[50px] shadow-[inset_0_0_0_3px] shadow-primary [animation-delay:-1.25s]" />
    </div>
  )
}

export { LumaSpin }
