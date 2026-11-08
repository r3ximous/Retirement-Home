import * as React from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

type CtaImportance = "primary" | "secondary" | "tertiary"
type Layout = "row" | "stacked"
type PrimaryVariant = "solid" | "gradient"
type SecondaryVariant = "outline" | "ghost"

type Cta = {
    id: string
    label: string
    href?: string
    importance: CtaImportance
    icon?: string
}

type SmartCtaRowProps = {
    ctas: Cta[]
    layout: Layout
    gap: number
    font: React.CSSProperties
    primaryVariant: PrimaryVariant
    secondaryVariant: SecondaryVariant
    primaryColor: string
    secondaryColor: string
    textColor: string
    fullWidthOnMobile: boolean
}

const MOBILE_BREAKPOINT = 768

const defaultCtas: Cta[] = [
    {
        id: "primary",
        label: "Get Started",
        href: "#",
        importance: "primary",
        icon: "→",
    },
    {
        id: "secondary",
        label: "Learn More",
        href: "#",
        importance: "secondary",
    },
]

function getInitialIsMobile() {
    if (typeof window === "undefined") {
        return false
    }

    if (typeof window.matchMedia === "function") {
        return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
            .matches
    }

    return window.innerWidth < MOBILE_BREAKPOINT
}

function useIsMobile(shouldObserve: boolean) {
    const [isMobile, setIsMobile] = React.useState(() => getInitialIsMobile())

    React.useEffect(() => {
        if (
            !shouldObserve ||
            typeof window === "undefined" ||
            typeof window.matchMedia !== "function"
        ) {
            return
        }

        const mediaQuery = window.matchMedia(
            `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
        )
        const updateIsMobile = () => setIsMobile(mediaQuery.matches)

        updateIsMobile()

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", updateIsMobile)

            return () =>
                mediaQuery.removeEventListener("change", updateIsMobile)
        }

        mediaQuery.addListener(updateIsMobile)

        return () => mediaQuery.removeListener(updateIsMobile)
    }, [shouldObserve])

    return isMobile
}

function readableTextColor(hexColor: string) {
    const rgbMatch = hexColor.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)

    if (rgbMatch) {
        return contrastForRgb(
            Number(rgbMatch[1]),
            Number(rgbMatch[2]),
            Number(rgbMatch[3])
        )
    }

    const raw = hexColor.replace("#", "")
    const normalized =
        raw.length === 3
            ? raw
                  .split("")
                  .map((character) => character + character)
                  .join("")
            : raw

    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
        return "#ffffff"
    }

    const red = parseInt(normalized.slice(0, 2), 16)
    const green = parseInt(normalized.slice(2, 4), 16)
    const blue = parseInt(normalized.slice(4, 6), 16)

    return contrastForRgb(red, green, blue)
}

function contrastForRgb(red: number, green: number, blue: number) {
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

    return luminance > 0.62 ? "#111111" : "#ffffff"
}

function gradientFrom(color: string) {
    return `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 74%, #ffffff) 100%)`
}

function normalizeFontWeight(
    fontWeight: React.CSSProperties["fontWeight"],
    fallback: number
) {
    if (typeof fontWeight === "number") {
        return fontWeight
    }

    if (typeof fontWeight === "string") {
        if (fontWeight === "bold") {
            return 700
        }

        const parsedWeight = Number(fontWeight)

        if (!Number.isNaN(parsedWeight)) {
            return parsedWeight
        }
    }

    return fallback
}

function getSafeHref(href?: string) {
    const value = href?.trim()

    if (!value) {
        return undefined
    }

    const lowerValue = value.toLowerCase()
    const hasSafeProtocol =
        lowerValue.startsWith("http://") ||
        lowerValue.startsWith("https://") ||
        lowerValue.startsWith("mailto:") ||
        lowerValue.startsWith("tel:")
    const isSafeRelative =
        value.startsWith("#") ||
        value.startsWith("/") ||
        value.startsWith("./") ||
        value.startsWith("../")

    return hasSafeProtocol || isSafeRelative ? value : undefined
}

function preventUnsafeNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export default function SmartCtaRow(props: Partial<SmartCtaRowProps>) {
    const {
        ctas = defaultCtas,
        layout = "row",
        gap = 12,
        font = { fontFamily: "Inter", fontWeight: 600 },
        primaryVariant = "solid",
        secondaryVariant = "outline",
        primaryColor = "#635BFF",
        secondaryColor = "#14B8A6",
        textColor = "#111827",
        fullWidthOnMobile = true,
    } = props

    const isStatic = useIsStaticRenderer()
    const isMobile = useIsMobile(!isStatic)
    const shouldStack = layout === "stacked" || (isMobile && fullWidthOnMobile)
    const shouldFillMobile = isMobile && fullWidthOnMobile
    const primaryContrast = readableTextColor(primaryColor)
    const secondaryContrast = readableTextColor(secondaryColor)
    const baseFontWeight = normalizeFontWeight(font.fontWeight, 600)

    return (
        <div
            className={`smart-cta-row${isStatic ? " smart-cta-row--static" : ""}`}
            style={{
                ...font,
                display: "flex",
                flexDirection: shouldStack ? "column" : "row",
                alignItems: shouldStack ? "stretch" : "center",
                justifyContent: "flex-start",
                flexWrap: "wrap",
                gap,
                width: "100%",
                minWidth: 0,
            }}
        >
            <style>{`
                .smart-cta-row__item {
                    position: relative;
                    isolation: isolate;
                    appearance: none;
                    box-sizing: border-box;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    overflow: hidden;
                    min-height: var(--cta-height);
                    min-width: min(var(--cta-min-width), 100%);
                    width: var(--cta-width);
                    max-width: 100%;
                    padding: var(--cta-padding);
                    border: 1px solid var(--cta-border);
                    border-radius: var(--cta-radius);
                    background: var(--cta-bg);
                    background-clip: padding-box;
                    color: var(--cta-color);
                    box-shadow: var(--cta-shadow);
                    font: inherit;
                    font-size: var(--cta-font-size);
                    font-weight: var(--cta-font-weight);
                    line-height: 1.15;
                    text-decoration: none;
                    text-align: center;
                    white-space: normal;
                    overflow-wrap: anywhere;
                    cursor: pointer;
                    touch-action: manipulation;
                    user-select: none;
                    transform: translate3d(0, 0, 0);
                    transition:
                        color var(--cta-motion-speed) var(--cta-ease),
                        border-color var(--cta-motion-speed) var(--cta-ease),
                        box-shadow var(--cta-motion-speed) var(--cta-ease),
                        transform var(--cta-motion-speed) var(--cta-ease);
                }

                .smart-cta-row__item::before {
                    content: "";
                    position: absolute;
                    inset: -1px;
                    z-index: 0;
                    background: var(--cta-fill);
                    transform: translate3d(-101%, 0, 0);
                    transform-origin: left center;
                    transition: transform var(--cta-fill-speed) var(--cta-ease);
                }

                .smart-cta-row__item:hover {
                    color: var(--cta-hover-color);
                    border-color: var(--cta-fill);
                    box-shadow: var(--cta-hover-shadow);
                    transform: translate3d(0, var(--cta-hover-lift), 0);
                }

                .smart-cta-row__item:hover::before {
                    transform: translate3d(0, 0, 0);
                }

                .smart-cta-row__item:focus-visible {
                    outline: 3px solid var(--cta-focus);
                    outline-offset: 3px;
                }

                .smart-cta-row__item:active {
                    transform: translate3d(0, 0, 0) scale(.99);
                }

                .smart-cta-row__label,
                .smart-cta-row__icon {
                    position: relative;
                    z-index: 1;
                }

                .smart-cta-row__icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.05em;
                    transition: transform var(--cta-motion-speed) var(--cta-ease);
                }

                .smart-cta-row__item:hover .smart-cta-row__icon {
                    transform: translate3d(var(--cta-icon-shift), 0, 0);
                }

                .smart-cta-row--static .smart-cta-row__item,
                .smart-cta-row--static .smart-cta-row__item::before,
                .smart-cta-row--static .smart-cta-row__icon {
                    transition: none;
                }

                .smart-cta-row--static .smart-cta-row__item:hover,
                .smart-cta-row--static .smart-cta-row__item:active {
                    transform: none;
                }

                @media (prefers-reduced-motion: reduce) {
                    .smart-cta-row__item,
                    .smart-cta-row__item::before,
                    .smart-cta-row__icon {
                        transition: none;
                    }
                }

                @media (hover: none) {
                    .smart-cta-row__item:hover,
                    .smart-cta-row__item:hover .smart-cta-row__icon {
                        transform: none;
                    }
                }
            `}</style>

            {ctas.map((cta, index) => {
                const importance = cta.importance || "secondary"
                const isPrimary = importance === "primary"
                const isSecondary = importance === "secondary"
                const fillColor = isPrimary ? primaryContrast : secondaryColor
                const hoverColor = isPrimary ? primaryColor : secondaryContrast

                const background = isPrimary
                    ? primaryVariant === "gradient"
                        ? gradientFrom(primaryColor)
                        : primaryColor
                    : "transparent"

                const borderColor = isPrimary
                    ? primaryColor
                    : isSecondary && secondaryVariant === "outline"
                      ? secondaryColor
                      : "transparent"
                const ctaFontWeight = isPrimary
                    ? Math.min(baseFontWeight + 100, 800)
                    : importance === "tertiary"
                      ? Math.max(baseFontWeight - 100, 400)
                      : baseFontWeight

                const itemStyle = {
                    "--cta-height": isPrimary ? "48px" : "44px",
                    "--cta-min-width": isPrimary
                        ? "132px"
                        : isSecondary
                          ? "112px"
                          : "0px",
                    "--cta-width": shouldFillMobile ? "100%" : "auto",
                    "--cta-padding": isPrimary ? "13px 22px" : "11px 18px",
                    "--cta-radius": isPrimary ? "12px" : "10px",
                    "--cta-bg": background,
                    "--cta-fill": fillColor,
                    "--cta-color": isPrimary ? primaryContrast : textColor,
                    "--cta-hover-color": hoverColor,
                    "--cta-border": borderColor,
                    "--cta-focus": isPrimary ? primaryColor : secondaryColor,
                    "--cta-font-size": isPrimary ? "15px" : "14px",
                    "--cta-font-weight": ctaFontWeight,
                    "--cta-shadow": isPrimary
                        ? `0 10px 24px color-mix(in srgb, ${primaryColor} 28%, transparent)`
                        : "none",
                    "--cta-hover-shadow": isPrimary
                        ? `0 14px 32px color-mix(in srgb, ${primaryColor} 36%, transparent)`
                        : `0 10px 24px color-mix(in srgb, ${secondaryColor} 18%, transparent)`,
                    "--cta-hover-lift": isPrimary ? "-3px" : "-2px",
                    "--cta-fill-speed": isStatic
                        ? "0ms"
                        : isPrimary
                          ? "420ms"
                          : "340ms",
                    "--cta-motion-speed": isStatic ? "0ms" : "180ms",
                    "--cta-ease": "cubic-bezier(.22, 1, .36, 1)",
                    "--cta-icon-shift": isPrimary ? "3px" : "2px",
                } as React.CSSProperties

                const content = (
                    <>
                        {cta.icon ? (
                            <span
                                className="smart-cta-row__icon"
                                aria-hidden="true"
                            >
                                {cta.icon}
                            </span>
                        ) : null}
                        <span className="smart-cta-row__label">
                            {cta.label}
                        </span>
                    </>
                )

                const key = cta.id || `${cta.label}-${index}`
                const className = `smart-cta-row__item smart-cta-row__item--${importance}`
                const hasHref = Boolean(cta.href?.trim())
                const safeHref = getSafeHref(cta.href)
                const hasUnsafeHref = hasHref && !safeHref

                if (hasHref) {
                    return (
                        <a
                            key={key}
                            className={className}
                            href={safeHref || "#"}
                            aria-disabled={hasUnsafeHref || undefined}
                            onClick={
                                hasUnsafeHref
                                    ? preventUnsafeNavigation
                                    : undefined
                            }
                            style={itemStyle}
                        >
                            {content}
                        </a>
                    )
                }

                return (
                    <button
                        key={key}
                        className={className}
                        type="button"
                        style={itemStyle}
                    >
                        {content}
                    </button>
                )
            })}
        </div>
    )
}

addPropertyControls(SmartCtaRow, {
    ctas: {
        type: ControlType.Array,
        title: "CTAs",
        control: {
            type: ControlType.Object,
            controls: {
                id: {
                    type: ControlType.String,
                    title: "ID",
                    defaultValue: "cta",
                },
                label: {
                    type: ControlType.String,
                    title: "Label",
                    defaultValue: "Get Started",
                },
                href: {
                    type: ControlType.String,
                    title: "Href",
                    defaultValue: "#",
                },
                importance: {
                    type: ControlType.Enum,
                    title: "Importance",
                    options: ["primary", "secondary", "tertiary"],
                    optionTitles: ["Primary", "Secondary", "Tertiary"],
                    defaultValue: "secondary",
                },
                icon: {
                    type: ControlType.String,
                    title: "Icon",
                    defaultValue: "",
                },
            },
        },
        defaultValue: defaultCtas,
    },
    layout: {
        type: ControlType.Enum,
        title: "Layout",
        options: ["row", "stacked"],
        optionTitles: ["Row", "Stacked"],
        defaultValue: "row",
        displaySegmentedControl: true,
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        defaultValue: 12,
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
    },
    font: {
        type: ControlType.Font,
        title: "Font",
        controls: "basic",
        displayFontSize: false,
        displayTextAlignment: false,
        defaultFontType: "sans-serif",
        defaultValue: {
            variant: "Semibold",
        },
    },
    fullWidthOnMobile: {
        type: ControlType.Boolean,
        title: "Mobile Full",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },
    primaryVariant: {
        type: ControlType.Enum,
        title: "Primary",
        options: ["solid", "gradient"],
        optionTitles: ["Solid", "Gradient"],
        defaultValue: "solid",
        displaySegmentedControl: true,
        hidden: (props: Partial<SmartCtaRowProps>) =>
            !(props.ctas || defaultCtas).some(
                (cta: Cta) => cta.importance === "primary"
            ),
    },
    secondaryVariant: {
        type: ControlType.Enum,
        title: "Secondary",
        options: ["outline", "ghost"],
        optionTitles: ["Outline", "Ghost"],
        defaultValue: "outline",
        displaySegmentedControl: true,
        hidden: (props: Partial<SmartCtaRowProps>) =>
            !(props.ctas || defaultCtas).some(
                (cta: Cta) => cta.importance === "secondary"
            ),
    },
    primaryColor: {
        type: ControlType.Color,
        title: "Primary",
        defaultValue: "#635BFF",
    },
    secondaryColor: {
        type: ControlType.Color,
        title: "Secondary",
        defaultValue: "#14B8A6",
    },
    textColor: {
        type: ControlType.Color,
        title: "Text",
        defaultValue: "#111827",
    },
})
