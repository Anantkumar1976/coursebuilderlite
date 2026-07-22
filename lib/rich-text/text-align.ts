import { Extension } from "@tiptap/core";

export type TextAlignValue = "left" | "center" | "right" | "justify";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: TextAlignValue) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

/**
 * Lightweight text-align extension (left / center / right / justify)
 * applied to paragraph and heading nodes via inline style.
 */
export const TextAlign = Extension.create({
  name: "textAlign",

  addOptions() {
    return {
      types: ["heading", "paragraph"] as string[],
      alignments: ["left", "center", "right", "justify"] as TextAlignValue[],
      defaultAlignment: "left" as TextAlignValue,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const align =
                element.style.textAlign ||
                element.getAttribute("align") ||
                this.options.defaultAlignment;
              return (this.options.alignments as string[]).includes(align)
                ? align
                : this.options.defaultAlignment;
            },
            renderHTML: (attributes) => {
              if (
                !attributes.textAlign ||
                attributes.textAlign === this.options.defaultAlignment
              ) {
                return {};
              }
              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: TextAlignValue) =>
        ({ commands }) => {
          if (!(this.options.alignments as string[]).includes(alignment)) {
            return false;
          }
          return this.options.types
            .map((type: string) =>
              commands.updateAttributes(type, { textAlign: alignment }),
            )
            .some(Boolean);
        },
      unsetTextAlign:
        () =>
        ({ commands }) =>
          this.options.types
            .map((type: string) =>
              commands.resetAttributes(type, "textAlign"),
            )
            .some(Boolean),
    };
  },
});
