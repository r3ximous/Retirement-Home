import { useState, useEffect, useRef, useId, CSSProperties } from "react"
import {
    motion,
    AnimatePresence,
} from "framer-motion"

interface ImageItem {
    src: string
    srcSet?: string
    alt?: string
}

const getImageSrc = (img: ImageItem | string): string =>
    typeof img === "string" ? img : img.src

interface RewardTier {
    max: number
    label: string
    code: string
}

interface Reward {
    label: string
    code: string
}

interface ThemeConfig {
    name: string
    title: string
    subtitle: string
    buttonText: string
    triggerText: string
    accentColor: string
    background: string
    rewards: RewardTier[]
    doublesReward: Reward
}

const THEMES: { [key: string]: ThemeConfig } = {
    ecommerce: {
        name: "E-Commerce",
        title: "Roll for a Discount",
        subtitle: "3 free rolls, real savings",
        buttonText: "Roll Dice",
        triggerText: "Roll for a Discount",
        accentColor: "#0f172a",
        background: "linear-gradient(160deg, #dbeafe 0%, #bfdbfe 100%)",
        rewards: [
            { max: 4, label: "5% off", code: "DICE5" },
            { max: 6, label: "10% off", code: "DICE10" },
            { max: 8, label: "15% off", code: "DICE15" },
            { max: 10, label: "20% off", code: "DICE20" },
            { max: 12, label: "25% off", code: "DICE25" },
        ],
        doublesReward: { label: "Free Shipping", code: "DOUBLES" },
    },
    campaign: {
        name: "Campaign / Sale",
        title: "Roll Before It's Gone",
        subtitle: "Limited-time drop, roll now",
        buttonText: "Roll for Deal",
        triggerText: "Roll for a Deal",
        accentColor: "#dc2626",
        background: "linear-gradient(160deg, #fff1f0 0%, #fecdd3 100%)",
        rewards: [
            { max: 4, label: "10% off", code: "SALE10" },
            { max: 6, label: "20% off", code: "SALE20" },
            { max: 8, label: "30% off", code: "SALE30" },
            { max: 10, label: "40% off", code: "SALE40" },
            { max: 12, label: "50% off", code: "SALE50" },
        ],
        doublesReward: { label: "Stack Extra 10%", code: "SALEDOUBLE" },
    },
    restaurant: {
        name: "Restaurant / Cafe",
        title: "Today's Lucky Roll",
        subtitle: "Scan, roll, treat yourself",
        buttonText: "Roll for Treat",
        triggerText: "Roll for a Treat",
        accentColor: "#b45309",
        background: "linear-gradient(160deg, #fff7ed 0%, #fde8cf 100%)",
        rewards: [
            { max: 4, label: "Free Coffee", code: "CAFE-COFFEE" },
            { max: 6, label: "10% off Bill", code: "CAFE10" },
            { max: 8, label: "Free Dessert", code: "CAFE-DESSERT" },
            { max: 10, label: "20% off Bill", code: "CAFE20" },
            { max: 12, label: "Free Appetizer", code: "CAFE-APP" },
        ],
        doublesReward: { label: "Meal On Us", code: "CAFE-FREE" },
    },
    saas: {
        name: "SaaS / Freemium",
        title: "Roll for a Plan Discount",
        subtitle: "One roll per new account",
        buttonText: "Roll Dice",
        triggerText: "Roll for a Discount",
        accentColor: "#4f46e5",
        background: "linear-gradient(160deg, #eef2ff 0%, #e0e7ff 100%)",
        rewards: [
            { max: 4, label: "10% off", code: "SAAS10" },
            { max: 6, label: "20% off", code: "SAAS20" },
            { max: 8, label: "1 Month Free", code: "SAAS-MONTH" },
            { max: 10, label: "30% off", code: "SAAS30" },
            { max: 12, label: "50% off", code: "SAAS50" },
        ],
        doublesReward: { label: "3 Months Free", code: "SAAS-3MO" },
    },
    event: {
        name: "Event / Tickets",
        title: "Roll for an Early Bird Deal",
        subtitle: "Before you check out",
        buttonText: "Roll for Bonus",
        triggerText: "Roll for a Bonus",
        accentColor: "#0891b2",
        background: "linear-gradient(160deg, #ecfeff 0%, #cffafe 100%)",
        rewards: [
            { max: 4, label: "5% off", code: "EVT5" },
            { max: 6, label: "10% off", code: "EVT10" },
            { max: 8, label: "Free Drink Ticket", code: "EVT-DRINK" },
            { max: 10, label: "15% off", code: "EVT15" },
            { max: 12, label: "VIP Upgrade", code: "EVT-VIP" },
        ],
        doublesReward: { label: "Free +1 Ticket", code: "EVT-PLUSONE" },
    },
}

const faceRotations: { [key: number]: { rotateX: number; rotateY: number } } = {
    1: { rotateX: 0, rotateY: 0 },
    2: { rotateX: 0, rotateY: 180 },
    3: { rotateX: 0, rotateY: -90 },
    4: { rotateX: 0, rotateY: 90 },
    5: { rotateX: -90, rotateY: 0 },
    6: { rotateX: 90, rotateY: 0 },
}

const PIP_LAYOUTS: { [key: number]: number[] } = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
}

// Module-level so identity is stable across parent re-renders —
// otherwise every state change (message, timers, popup) would remount
// the dice and glitch the roll/settle animation.
function Pips({ number }: { number: number }) {
    const active = PIP_LAYOUTS[number] || []
    return (
        <div
            style={{
                width: "65%",
                height: "65%",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
            }}
        >
            {Array.from({ length: 9 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {active.includes(i + 1) && (
                        <div
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: "#0f172a",
                            }}
                        />
                    )}
                </div>
            ))}
        </div>
    )
}

// Default widget icon — a gift box with a gold ribbon and a small sparkle,
// reads as "premium reward" far better than a flat dice emoji.
function GiftIcon() {
    return (
        <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
            style={{ position: "relative" }}
        >
            <defs>
                <linearGradient id="giftRibbon" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
            </defs>
            <rect
                x="3.5"
                y="10"
                width="17"
                height="9.5"
                rx="1.5"
                fill="#ffffff"
            />
            <rect x="2.5" y="7" width="19" height="4" rx="1" fill="#ffffff" />
            <rect
                x="10.4"
                y="7"
                width="3.2"
                height="12.5"
                fill="url(#giftRibbon)"
            />
            <rect x="2.5" y="7" width="19" height="4" rx="1" fill="none" />
            <path
                d="M12 7c-1.6 0-3-1-3.6-2.1C7.6 3.2 8.5 2 9.8 2c1.3 0 2.2 1.4 2.2 3 0-1.6.9-3 2.2-3 1.3 0 2.2 1.2 1.4 2.9C15 6 13.6 7 12 7z"
                fill="url(#giftRibbon)"
            />
            <path
                d="M18.3 4.2l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z"
                fill="#ffffff"
            />
        </svg>
    )
}

function Dice3D({
    value,
    delay = 0,
    isRolling,
}: {
    value: number
    delay?: number
    isRolling: boolean
}) {
    const final = faceRotations[value]
    return (
        <div style={{ width: 90, height: 90, perspective: 700 }}>
            <motion.div
                animate={
                    isRolling
                        ? {
                              rotateX: [0, 480, 960, 1440, final.rotateX],
                              rotateY: [0, -360, 720, -1080, final.rotateY],
                              rotateZ: [0, 180, 360, 540, 0],
                              y: [0, -45, -10, 6, 0],
                          }
                        : {
                              rotateX: final.rotateX,
                              rotateY: final.rotateY,
                              rotateZ: 0,
                              y: 0,
                          }
                }
                transition={
                    isRolling
                        ? {
                              duration: 1.7,
                              ease: [0.22, 0.8, 0.2, 1],
                              delay,
                          }
                        : {
                              duration: 0.45,
                              ease: "easeOut",
                              delay: delay * 0.5,
                          }
                }
                style={{
                    width: "100%",
                    height: "100%",
                    position: "relative",
                    transformStyle: "preserve-3d",
                }}
            >
                {[
                    { face: 1, transform: "rotateY(0deg) translateZ(45px)" },
                    {
                        face: 2,
                        transform: "rotateY(180deg) translateZ(45px)",
                    },
                    { face: 3, transform: "rotateY(90deg) translateZ(45px)" },
                    {
                        face: 4,
                        transform: "rotateY(-90deg) translateZ(45px)",
                    },
                    { face: 5, transform: "rotateX(90deg) translateZ(45px)" },
                    {
                        face: 6,
                        transform: "rotateX(-90deg) translateZ(45px)",
                    },
                ].map((item) => (
                    <div
                        key={item.face}
                        style={{
                            position: "absolute",
                            width: 90,
                            height: 90,
                            background: "#ffffff",
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.07)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backfaceVisibility: "hidden",
                            transform: item.transform,
                        }}
                    >
                        <Pips number={item.face} />
                    </div>
                ))}
            </motion.div>
        </div>
    )
}

interface DiceDiscountPopupProps {
    accentColor?: string
    demoMode?: boolean
    theme?: string
    gachaAvailable?: boolean
    onGachaRoll?: () => Promise<{ label: string }>
    asPopup?: boolean
    trigger?: "manual" | "delay" | "scroll"
    delaySeconds?: number
    widgetPosition?: "bottom-right" | "bottom-left"
    widgetIcon?: ImageItem | string
    storageKey?: string
    customizeCopy?: boolean
    customTitle?: string
    customSubtitle?: string
    customButtonText?: string
    customTriggerText?: string
    customReward1Label?: string
    customReward1Code?: string
    customReward2Label?: string
    customReward2Code?: string
    customReward3Label?: string
    customReward3Code?: string
    customReward4Label?: string
    customReward4Code?: string
    customReward5Label?: string
    customReward5Code?: string
    customDoublesLabel?: string
    customDoublesCode?: string
    customBackground?: string
}

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 420
 * @framerIntrinsicHeight 620
 */
export default function DiceDiscountPopup(props: DiceDiscountPopupProps) {
    const {
        accentColor,
        demoMode = false,
        theme = "ecommerce",
        gachaAvailable = false,
        onGachaRoll,
        asPopup = false,
        trigger = "manual",
        delaySeconds = 4,
        widgetPosition = "bottom-right",
        widgetIcon,
        storageKey = "",
        customizeCopy = false,
        customTitle,
        customSubtitle,
        customButtonText,
        customTriggerText,
        customReward1Label,
        customReward1Code,
        customReward2Label,
        customReward2Code,
        customReward3Label,
        customReward3Code,
        customReward4Label,
        customReward4Code,
        customReward5Label,
        customReward5Code,
        customDoublesLabel,
        customDoublesCode,
        customBackground,
    } = props

    const isStatic = false
    const uid = useId()
    const rootRef = useRef<HTMLDivElement>(null)
    const demoBarRef = useRef<HTMLDivElement>(null)
    const popupCardRef = useRef<HTMLDivElement>(null)
    const rewardModalRef = useRef<HTMLDivElement>(null)
    const widgetTriggerRef = useRef<HTMLButtonElement>(null)
    const widgetContainerRef = useRef<HTMLDivElement>(null)
    const rollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    )
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    )
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined
    )

    const [dice1, setDice1] = useState(1)
    const [dice2, setDice2] = useState(1)
    const [isRolling, setIsRolling] = useState(false)
    const [total, setTotal] = useState<number | null>(null)
    const [currentReward, setCurrentReward] = useState<{
        label: string
        code: string
    } | null>(null)
    const [showPopup, setShowPopup] = useState(false)
    const [rewards, setRewards] = useState<{ label: string; code: string }[]>(
        []
    )
    const [rollsLeft, setRollsLeft] = useState(3)
    const [message, setMessage] = useState("You have 3 free rolls")
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    // ── Popup mode state ──
    const [popupOpen, setPopupOpen] = useState(!asPopup)
    const [scrollTriggered, setScrollTriggered] = useState(false)
    const [widgetHover, setWidgetHover] = useState(false)

    // ── Demo Panel state ──
    const [demoFreeRolls, setDemoFreeRolls] = useState(3)
    const [demoTheme, setDemoTheme] = useState(theme)
    const [demoAsPopup, setDemoAsPopup] = useState(asPopup)
    const [demoWidgetPosition, setDemoWidgetPosition] = useState(widgetPosition)
    const [demoAccentColor, setDemoAccentColor] = useState(
        accentColor || THEMES[theme]?.accentColor || "#0f172a"
    )
    const [demoBackground, setDemoBackground] = useState("")
    const [demoBarHeight, setDemoBarHeight] = useState(0)
    const [widgetVisible, setWidgetVisible] = useState(true)

    const activeThemeKey = demoMode ? demoTheme : theme
    const baseTheme = THEMES[activeThemeKey] || THEMES.ecommerce
    const isGachaMode = typeof onGachaRoll === "function"

    const ov = (base: string, override?: string): string =>
        override && override.trim() !== "" ? override : base

    const customRewardLabels = [
        customReward1Label,
        customReward2Label,
        customReward3Label,
        customReward4Label,
        customReward5Label,
    ]
    const customRewardCodes = [
        customReward1Code,
        customReward2Code,
        customReward3Code,
        customReward4Code,
        customReward5Code,
    ]

    const activeTheme: ThemeConfig = !customizeCopy
        ? baseTheme
        : {
              ...baseTheme,
              title: ov(baseTheme.title, customTitle),
              subtitle: ov(baseTheme.subtitle, customSubtitle),
              buttonText: ov(baseTheme.buttonText, customButtonText),
              triggerText: ov(baseTheme.triggerText, customTriggerText),
              background: ov(baseTheme.background, customBackground),
              rewards: baseTheme.rewards.map((tier, i) => ({
                  ...tier,
                  label: ov(tier.label, customRewardLabels[i]),
                  code: ov(tier.code, customRewardCodes[i]),
              })),
              doublesReward: {
                  label: ov(baseTheme.doublesReward.label, customDoublesLabel),
                  code: ov(baseTheme.doublesReward.code, customDoublesCode),
              },
          }

    const isPopupMode = demoMode ? demoAsPopup : asPopup
    const activeWidgetPosition = demoMode ? demoWidgetPosition : widgetPosition
    const rawAccent = demoMode ? demoAccentColor : accentColor
    const canRoll = isGachaMode ? gachaAvailable : rollsLeft > 0
    const displayedMessage = isGachaMode
        ? isRolling
            ? "Rolling..."
            : currentReward
              ? "Your Gacha reward has been saved"
              : gachaAvailable
                ? "One daily roll available"
                : "Today's roll has been used"
        : message
    const resolvedAccent =
        rawAccent && rawAccent.toLowerCase() !== "#ffffff"
            ? rawAccent
            : activeTheme.accentColor

    const suffix = storageKey.trim() ? `-${storageKey.trim()}` : ""
    const rollsKey = `dice-rolls-left${suffix}`
    const rewardsKey = `dice-rewards${suffix}`

    useEffect(() => {
        if (isGachaMode) return

        const savedRolls = localStorage.getItem(rollsKey)
        const savedRewards = localStorage.getItem(rewardsKey)

        // Hydrate the persisted game state after the browser is available.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (savedRolls !== null) setRollsLeft(parseInt(savedRolls))
        if (savedRewards) setRewards(JSON.parse(savedRewards))

        if (savedRolls === "0") {
            setMessage("All rolls used")
        }
    }, [gachaAvailable, isGachaMode, rewardsKey, rollsKey])

    useEffect(() => {
        return () => {
            clearTimeout(rollTimerRef.current)
            clearTimeout(settleTimerRef.current)
            clearTimeout(copyTimerRef.current)
        }
    }, [])

    // Reset open/closed state whenever popup mode is toggled (canvas editing
    // or the Demo Panel's live "Popup Mode" switch)
    useEffect(() => {
        // This intentionally mirrors the current popup mode prop/state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPopupOpen(!isPopupMode)
    }, [isPopupMode])

    // Delay trigger — opens the popup N seconds after mount
    useEffect(() => {
        if (!isPopupMode || trigger !== "delay" || isStatic) return
        const t = setTimeout(() => setPopupOpen(true), delaySeconds * 1000)
        return () => clearTimeout(t)
    }, [isPopupMode, trigger, delaySeconds, isStatic])

    // Scroll-into-view trigger — observes the component's own root only
    useEffect(() => {
        if (
            !isPopupMode ||
            trigger !== "scroll" ||
            isStatic ||
            !rootRef.current
        )
            return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !scrollTriggered) {
                    setScrollTriggered(true)
                    setPopupOpen(true)
                }
            },
            { threshold: 0.4 }
        )
        observer.observe(rootRef.current)
        return () => observer.disconnect()
    }, [isPopupMode, trigger, isStatic, scrollTriggered])

    // Measure the Demo Bar's real height — it wraps to multiple rows on
    // narrow viewports, so a fixed offset isn't enough to keep the game
    // card from sliding underneath it.
    useEffect(() => {
        if (!demoMode || isStatic || !demoBarRef.current) return
        const el = demoBarRef.current
        const ro = new ResizeObserver(([entry]) => {
            setDemoBarHeight(entry.contentRect.height)
        })
        ro.observe(el)
        return () => ro.disconnect()
    }, [demoMode, isStatic])

    // Pause the widget's pulsing ring when it isn't actually on screen —
    // the button is position:fixed so this rarely fires, but it keeps the
    // repeat:Infinity animation from ever running unguarded.
    useEffect(() => {
        if (isStatic || !isPopupMode || !widgetContainerRef.current) return
        const el = widgetContainerRef.current
        const observer = new IntersectionObserver(
            ([entry]) => setWidgetVisible(entry.isIntersecting),
            { threshold: 0 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [isPopupMode, isStatic])

    // Move focus into the popup dialog when it opens, and back to the
    // trigger button when it closes — keyboard/screen-reader users
    // shouldn't be left behind on a background page they can't see.
    // (Skips the very first render so mounting doesn't steal focus.)
    const wasPopupOpenRef = useRef(false)
    useEffect(() => {
        if (isStatic || !isPopupMode) return
        if (popupOpen) {
            popupCardRef.current?.focus()
        } else if (wasPopupOpenRef.current) {
            widgetTriggerRef.current?.focus()
        }
        wasPopupOpenRef.current = popupOpen
    }, [isPopupMode, popupOpen, isStatic])

    // Same for the "You won!" reward dialog
    useEffect(() => {
        if (isStatic || !showPopup) return
        rewardModalRef.current?.focus()
    }, [showPopup, isStatic])

    const getReward = (sum: number, isDoubles: boolean): Reward => {
        if (isDoubles) return activeTheme.doublesReward
        const tier = activeTheme.rewards.find((t) => sum <= t.max)
        return tier || activeTheme.rewards[activeTheme.rewards.length - 1]
    }

    const rollDice = () => {
        if (!canRoll || isRolling) return

        setIsRolling(true)
        setTotal(null)
        setMessage("Rolling...")

        clearTimeout(rollTimerRef.current)
        clearTimeout(settleTimerRef.current)

        rollTimerRef.current = setTimeout(async () => {
            const side1 = Math.floor(Math.random() * 6) + 1
            const side2 = Math.floor(Math.random() * 6) + 1
            const sum = side1 + side2

            if (isGachaMode && onGachaRoll) {
                try {
                    const reward = await onGachaRoll()
                    setDice1(side1)
                    setDice2(side2)
                    setTotal(sum)
                    setCurrentReward({ label: reward.label, code: "" })
                    setIsRolling(false)
                    setMessage("Your Gacha reward has been saved")
                    settleTimerRef.current = setTimeout(() => {
                        setShowPopup(true)
                    }, 600)
                } catch (error) {
                    setIsRolling(false)
                    setMessage(
                        error instanceof Error
                            ? error.message
                            : "Unable to complete your Gacha roll.",
                    )
                }
                return
            }

            const isDoubles = side1 === side2
            const won = getReward(sum, isDoubles)

            setDice1(side1)
            setDice2(side2)
            setTotal(sum)
            setCurrentReward(won)
            setIsRolling(false)

            const newRewards = [...rewards, won]
            const newRollsLeft = rollsLeft - 1

            setRewards(newRewards)
            setRollsLeft(newRollsLeft)

            localStorage.setItem(rewardsKey, JSON.stringify(newRewards))
            localStorage.setItem(rollsKey, newRollsLeft.toString())

            if (newRollsLeft === 0) {
                setMessage("All rolls used")
            } else {
                setMessage(
                    `${newRollsLeft} roll${newRollsLeft > 1 ? "s" : ""} left`
                )
            }

            // Wait for the dice to visually settle onto their final face
            // before showing the reward popup on top of them.
            settleTimerRef.current = setTimeout(() => {
                setShowPopup(true)
            }, 600)
        }, 1800)
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code).catch(() => {})
        setCopiedCode(code)
        clearTimeout(copyTimerRef.current)
        copyTimerRef.current = setTimeout(() => setCopiedCode(null), 1500)
    }

    const resetGame = (freshRolls?: number) => {
        const n = freshRolls ?? (demoMode ? demoFreeRolls : 3)
        setDice1(1)
        setDice2(1)
        setIsRolling(false)
        setTotal(null)
        setCurrentReward(null)
        setShowPopup(false)
        setRewards([])
        setRollsLeft(n)
        setCopiedCode(null)
        setMessage(`You have ${n} free roll${n === 1 ? "" : "s"}`)
        localStorage.setItem(rewardsKey, JSON.stringify([]))
        localStorage.setItem(rollsKey, n.toString())
    }

    // Demo-only: instantly preview a reward tier without spending a roll
    const previewRoll = (side1: number, side2: number) => {
        if (isRolling) return
        setIsRolling(true)
        setTotal(null)
        setShowPopup(false)
        setMessage("Rolling...")

        clearTimeout(rollTimerRef.current)
        clearTimeout(settleTimerRef.current)

        rollTimerRef.current = setTimeout(() => {
            const sum = side1 + side2
            const isDoubles = side1 === side2
            const won = getReward(sum, isDoubles)

            setDice1(side1)
            setDice2(side2)
            setTotal(sum)
            setCurrentReward(won)
            setIsRolling(false)
            setMessage(
                rollsLeft > 0
                    ? `${rollsLeft} roll${rollsLeft > 1 ? "s" : ""} left`
                    : "All rolls used"
            )

            settleTimerRef.current = setTimeout(() => {
                setShowPopup(true)
            }, 600)
        }, 1800)
    }

    const wrapperStyle: CSSProperties = {
        ...styles.wrapper,
        background:
            demoMode && demoBackground
                ? demoBackground
                : activeTheme.background,
        ...(isPopupMode
            ? {
                  height: "auto",
                  minHeight: 0,
                  maxHeight: demoMode
                      ? `calc(100vh - ${demoBarHeight + 40}px)`
                      : "90vh",
                  overflowY: "auto",
              }
            : {}),
    }

    const gameCard = (
        <div style={wrapperStyle}>
            <h2 id={`${uid}-title`} style={styles.title}>
                {activeTheme.title}
            </h2>
            <div style={styles.subtitle}>{activeTheme.subtitle}</div>

            <div style={styles.diceRow} aria-hidden="true">
                <Dice3D value={dice1} delay={0} isRolling={isRolling} />
                <Dice3D value={dice2} delay={0.1} isRolling={isRolling} />
            </div>

            <div style={styles.resultCard}>
                <div style={styles.resultLabel}>
                    {isGachaMode ? "GACHA REWARD" : "RESULT"}
                </div>
                <div
                    style={{
                        ...styles.resultValue,
                        ...(isGachaMode ? { fontSize: 18, lineHeight: "24px" } : {}),
                    }}
                    aria-live="polite"
                >
                    {isGachaMode
                        ? currentReward?.label ?? "—"
                        : total !== null
                          ? total
                          : "—"}
                </div>
            </div>

            <div style={styles.message} aria-live="polite">
                {displayedMessage}
            </div>

            <motion.button
                onClick={rollDice}
                whileHover={{ scale: !canRoll || isRolling ? 1 : 1.04 }}
                whileTap={{ scale: !canRoll || isRolling ? 1 : 0.96 }}
                disabled={!canRoll || isRolling}
                style={{
                    ...styles.button,
                    backgroundColor: resolvedAccent,
                    opacity: !canRoll || isRolling ? 0.5 : 1,
                    cursor:
                        !canRoll || isRolling ? "not-allowed" : "pointer",
                }}
            >
                {isRolling
                    ? "Rolling..."
                    : !canRoll
                      ? isGachaMode
                          ? "Come Back Tomorrow"
                          : "No Rolls Left"
                      : isGachaMode
                        ? "Roll for Today's Reward"
                        : `${activeTheme.buttonText} (${rollsLeft} left)`}
            </motion.button>

            {/* Kazanılan Kuponlar - Selected yok */}
            {!isGachaMode && rewards.length > 0 && (
                <div style={styles.rewardsSection}>
                    <div style={styles.rewardsTitle}>Your Rewards</div>

                    <div style={styles.rewardsList}>
                        {rewards.map((r, i) => {
                            const isCopied = copiedCode === r.code

                            return (
                                <div key={i} style={styles.rewardCard}>
                                    <div>
                                        <div style={styles.rewardLabel}>
                                            {r.label}
                                        </div>
                                        <div style={styles.rewardCode}>
                                            {r.code}
                                        </div>
                                    </div>

                                    {/* Sağdaki Copy ikonu */}
                                    <button
                                        onClick={() => copyCode(r.code)}
                                        style={styles.copyIconBtn}
                                        title="Copy code"
                                        aria-label="Copy code"
                                    >
                                        {isCopied ? (
                                            <span
                                                style={{
                                                    color: "#22c55e",
                                                    fontSize: 15,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                ✓
                                            </span>
                                        ) : (
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#64748b"
                                                strokeWidth="2"
                                            >
                                                <rect
                                                    x="9"
                                                    y="9"
                                                    width="13"
                                                    height="13"
                                                    rx="2"
                                                    ry="2"
                                                ></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Popup */}
            <AnimatePresence>
                {showPopup && currentReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.overlay}
                    >
                        <motion.div
                            ref={rewardModalRef}
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={`${uid}-reward-title`}
                            tabIndex={-1}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setShowPopup(false)
                            }}
                            style={styles.modal}
                        >
                            <h3
                                id={`${uid}-reward-title`}
                                style={styles.modalTitle}
                            >
                                You won!
                            </h3>
                            <p style={styles.modalDesc}>
                                <strong>{currentReward.label}</strong>
                            </p>
                            {isGachaMode ? (
                                <p style={styles.modalDesc}>
                                    Saved to your rewards history.
                                </p>
                            ) : (
                                <div style={styles.codeBox}>
                                    <span style={styles.code}>
                                        {currentReward.code}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => setShowPopup(false)}
                                style={{
                                    ...styles.claimBtn,
                                    backgroundColor: resolvedAccent,
                                }}
                            >
                                Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )

    const widgetOnRight = activeWidgetPosition !== "bottom-left"

    // ── Demo Bar — presentation controls, fixed at the bottom, outside the
    // popup so it stays reachable no matter what the widget is doing ──
    const demoBar = demoMode ? (
        <div ref={demoBarRef} style={styles.demoBar}>
            <div style={styles.demoChip}>
                <div style={styles.demoDot} />
                <span style={styles.demoTitle}>Demo</span>
            </div>

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Concept</span>
                <div style={styles.demoBtns}>
                    {Object.keys(THEMES).map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                setDemoTheme(key)
                                resetGame(demoFreeRolls)
                            }}
                            aria-pressed={demoTheme === key}
                            style={
                                demoTheme === key
                                    ? styles.demoBtnOn
                                    : styles.demoBtnOff
                            }
                        >
                            {THEMES[key].name}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Popup Mode</span>
                <div style={styles.demoBtns}>
                    <button
                        onClick={() => setDemoAsPopup(true)}
                        aria-pressed={demoAsPopup}
                        style={
                            demoAsPopup ? styles.demoBtnOn : styles.demoBtnOff
                        }
                    >
                        On
                    </button>
                    <button
                        onClick={() => setDemoAsPopup(false)}
                        aria-pressed={!demoAsPopup}
                        style={
                            !demoAsPopup ? styles.demoBtnOn : styles.demoBtnOff
                        }
                    >
                        Off
                    </button>
                </div>
            </div>

            {demoAsPopup && (
                <div style={styles.demoRow}>
                    <span style={styles.demoLabel}>Widget Corner</span>
                    <div style={styles.demoBtns}>
                        <button
                            onClick={() =>
                                setDemoWidgetPosition("bottom-right")
                            }
                            aria-pressed={demoWidgetPosition === "bottom-right"}
                            style={
                                demoWidgetPosition === "bottom-right"
                                    ? styles.demoBtnOn
                                    : styles.demoBtnOff
                            }
                        >
                            Right
                        </button>
                        <button
                            onClick={() => setDemoWidgetPosition("bottom-left")}
                            aria-pressed={demoWidgetPosition === "bottom-left"}
                            style={
                                demoWidgetPosition === "bottom-left"
                                    ? styles.demoBtnOn
                                    : styles.demoBtnOff
                            }
                        >
                            Left
                        </button>
                    </div>
                </div>
            )}

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Accent Color</span>
                <input
                    type="color"
                    value={demoAccentColor}
                    onChange={(e) => setDemoAccentColor(e.target.value)}
                    aria-label="Accent color"
                    style={styles.demoColorInput}
                />
            </div>

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Background</span>
                <input
                    type="color"
                    value={demoBackground || "#eef2f6"}
                    onChange={(e) => setDemoBackground(e.target.value)}
                    aria-label="Background color"
                    style={styles.demoColorInput}
                />
                {demoBackground && (
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => setDemoBackground("")}
                    >
                        Reset
                    </button>
                )}
            </div>

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Free Rolls</span>
                <div style={styles.demoBtns}>
                    {[1, 3, 5, 10].map((n) => (
                        <button
                            key={n}
                            onClick={() => {
                                setDemoFreeRolls(n)
                                resetGame(n)
                            }}
                            aria-pressed={demoFreeRolls === n}
                            style={
                                demoFreeRolls === n
                                    ? styles.demoBtnOn
                                    : styles.demoBtnOff
                            }
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Preview Win</span>
                <div style={styles.demoBtns}>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => previewRoll(1, 2)}
                    >
                        Tier 1
                    </button>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => previewRoll(2, 3)}
                    >
                        Tier 2
                    </button>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => previewRoll(3, 4)}
                    >
                        Tier 3
                    </button>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => previewRoll(4, 5)}
                    >
                        Tier 4
                    </button>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => previewRoll(5, 6)}
                    >
                        Tier 5
                    </button>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => previewRoll(4, 4)}
                    >
                        Doubles
                    </button>
                </div>
            </div>

            <div style={styles.demoRow}>
                <span style={styles.demoLabel}>Game</span>
                <div style={styles.demoBtns}>
                    <button
                        style={styles.demoBtnOff}
                        onClick={() => resetGame()}
                    >
                        ↺ Reset Game
                    </button>
                </div>
            </div>
        </div>
    ) : null

    if (!isPopupMode) {
        return (
            <div ref={rootRef}>
                {demoMode ? (
                    <div
                        style={{
                            ...styles.inlineDemoStage,
                            paddingTop: demoBarHeight + 24,
                        }}
                    >
                        <div style={styles.inlineDemoCardWrap}>{gameCard}</div>
                    </div>
                ) : (
                    gameCard
                )}
                {demoBar}
            </div>
        )
    }

    return (
        <div ref={rootRef}>
            <div
                ref={widgetContainerRef}
                style={{
                    ...styles.widgetContainer,
                    flexDirection: widgetOnRight ? "row-reverse" : "row",
                    ...(widgetOnRight ? { right: 24 } : { left: 24 }),
                }}
            >
                <motion.button
                    ref={widgetTriggerRef}
                    onClick={() => setPopupOpen(true)}
                    onHoverStart={() => setWidgetHover(true)}
                    onHoverEnd={() => setWidgetHover(false)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    aria-label={activeTheme.triggerText}
                    style={{
                        ...styles.widgetIconBtn,
                        backgroundColor: resolvedAccent,
                    }}
                >
                    <motion.span
                        style={styles.widgetPulse}
                        animate={
                            isStatic || !widgetVisible
                                ? undefined
                                : {
                                      scale: [1, 1.6, 1.6],
                                      opacity: [0.55, 0, 0],
                                  }
                        }
                        transition={
                            isStatic || !widgetVisible
                                ? { duration: 0 }
                                : {
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: "easeOut",
                                  }
                        }
                    />
                    {widgetIcon ? (
                        <img
                            src={getImageSrc(widgetIcon)}
                            alt=""
                            style={styles.widgetIconImg}
                        />
                    ) : (
                        <GiftIcon />
                    )}
                </motion.button>

                <AnimatePresence>
                    {widgetHover && (
                        <motion.div
                            initial={{
                                opacity: 0,
                                x: widgetOnRight ? 10 : -10,
                            }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{
                                opacity: 0,
                                x: widgetOnRight ? 10 : -10,
                            }}
                            transition={{ duration: 0.18 }}
                            style={styles.widgetLabel}
                        >
                            {activeTheme.triggerText}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {popupOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            ...styles.popupOverlayFixed,
                            ...(demoMode
                                ? { paddingTop: demoBarHeight + 20 }
                                : {}),
                        }}
                    >
                        <motion.div
                            ref={popupCardRef}
                            initial={{ scale: 0.92, y: 16 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={`${uid}-title`}
                            tabIndex={-1}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setPopupOpen(false)
                            }}
                            style={{
                                ...styles.popupCardWrap,
                                ...(demoMode
                                    ? {
                                          maxHeight: `calc(100vh - ${demoBarHeight + 40}px)`,
                                      }
                                    : {}),
                            }}
                        >
                            {gameCard}
                            <button
                                onClick={() => setPopupOpen(false)}
                                aria-label="Close"
                                style={styles.popupClose}
                            >
                                ×
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {demoBar}
        </div>
    )
}

const styles: { [key: string]: CSSProperties } = {
    wrapper: {
        width: "100%",
        minHeight: "100%",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "linear-gradient(160deg, #dbeafe 0%, #bfdbfe 100%)",
        borderRadius: 24,
        padding: "24px 20px",
        fontFamily: "'Nunito', system-ui, sans-serif",
        userSelect: "none",
        boxSizing: "border-box",
        position: "relative",
        overflowY: "visible",
    },
    title: {
        margin: "0 0 4px 0",
        fontSize: 22,
        fontWeight: 800,
        color: "#0f172a",
        textAlign: "center",
    },
    subtitle: {
        margin: "0 0 18px 0",
        fontSize: 13,
        color: "#64748b",
        fontWeight: 600,
        textAlign: "center",
    },
    widgetContainer: {
        position: "fixed",
        bottom: 24,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    widgetIconBtn: {
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        cursor: "pointer",
        boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
        position: "relative",
        flexShrink: 0,
    },
    widgetPulse: {
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.9)",
        pointerEvents: "none",
    },
    widgetIconImg: {
        position: "relative",
        width: 30,
        height: 30,
        objectFit: "cover",
        borderRadius: "50%",
    },
    widgetLabel: {
        padding: "10px 16px",
        borderRadius: 12,
        background: "#0f172a",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
    },
    popupOverlayFixed: {
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
        boxSizing: "border-box",
    },
    popupCardWrap: {
        width: "100%",
        maxWidth: 420,
        maxHeight: "90vh",
        position: "relative",
    },
    popupClose: {
        position: "absolute",
        top: -14,
        right: -14,
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: "none",
        background: "#ffffff",
        color: "#334155",
        fontSize: 18,
        lineHeight: "32px",
        textAlign: "center",
        cursor: "pointer",
        padding: 0,
        boxShadow: "0 4px 12px rgba(15,23,42,0.25)",
        zIndex: 100,
    },
    inlineDemoStage: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 96,
        paddingLeft: 20,
        paddingRight: 20,
        boxSizing: "border-box",
    },
    inlineDemoCardWrap: {
        width: "100%",
        maxWidth: 460,
    },
    demoBar: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
        padding: "10px 16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 16,
        boxSizing: "border-box",
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        fontFamily: "'Nunito', system-ui, sans-serif",
    },
    demoChip: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        flexShrink: 0,
    },
    demoDot: {
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "#f97316",
        boxShadow: "0 0 6px rgba(249,115,22,0.6)",
        flexShrink: 0,
    },
    demoTitle: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.4,
        color: "#334155",
        textTransform: "uppercase",
    },
    demoRow: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    demoLabel: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        color: "#64748b",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        flexShrink: 0,
    },
    demoBtns: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        flex: 1,
    },
    demoBtnOn: {
        padding: "5px 11px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        background: "#0f172a",
        color: "#ffffff",
    },
    demoBtnOff: {
        padding: "5px 11px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(15,23,42,0.06)",
        color: "#475569",
    },
    demoColorInput: {
        width: 34,
        height: 26,
        border: "none",
        borderRadius: 8,
        padding: 0,
        cursor: "pointer",
        background: "none",
    },
    diceRow: {
        display: "flex",
        gap: 28,
        marginBottom: 24,
        perspective: 800,
    },
    resultCard: {
        width: "100%",
        maxWidth: 280,
        background: "rgba(255,255,255,0.8)",
        borderRadius: 16,
        padding: "12px 16px",
        textAlign: "center",
        marginBottom: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    },
    resultLabel: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.2,
        color: "#64748b",
    },
    resultValue: {
        fontSize: 36,
        fontWeight: 800,
        color: "#0f172a",
    },
    message: {
        fontSize: 14,
        color: "#64748b",
        marginBottom: 16,
        textAlign: "center",
    },
    button: {
        padding: "13px 32px",
        borderRadius: 50,
        border: "none",
        color: "white",
        fontWeight: 700,
        fontSize: 15,
        marginBottom: 24,
    },
    rewardsSection: {
        width: "100%",
        maxWidth: 340,
        marginTop: 8,
    },
    rewardsTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: "#475569",
        marginBottom: 12,
        textAlign: "center",
    },
    rewardsList: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    rewardCard: {
        background: "white",
        borderRadius: 14,
        padding: "14px 16px",
        border: "2px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rewardLabel: {
        fontSize: 16,
        fontWeight: 700,
        color: "#0f172a",
    },
    rewardCode: {
        fontSize: 13,
        color: "#c2410c",
        fontWeight: 600,
        marginTop: 2,
    },
    copyIconBtn: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 6,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    overlay: {
        position: "absolute",
        inset: 0,
        background: "rgba(226,232,240,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        borderRadius: 24,
        padding: 16,
    },
    modal: {
        background: "white",
        borderRadius: 20,
        padding: "28px 24px",
        width: "100%",
        maxWidth: 300,
        textAlign: "center",
        boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
    },
    modalTitle: {
        margin: 0,
        fontSize: 24,
        fontWeight: 800,
        color: "#0f172a",
    },
    modalDesc: {
        margin: "10px 0 16px",
        fontSize: 16,
        color: "#334155",
    },
    codeBox: {
        background: "#fff7ed",
        border: "2px dashed #f97316",
        borderRadius: 12,
        padding: "12px",
        marginBottom: 18,
    },
    code: {
        fontWeight: 800,
        fontSize: 18,
        color: "#c2410c",
    },
    claimBtn: {
        width: "100%",
        padding: "13px",
        borderRadius: 12,
        border: "none",
        color: "white",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
    },
}
