"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Mic, MicOff, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "../components/cart-provider";
import { menuItems } from "./menu-data";
import {
  parseVoiceOrder,
  type UnresolvedVoicePhrase,
  type VoiceOrderItem,
} from "./voice-order-parser";

interface SpeechRecognitionResultLike extends ArrayLike<{ transcript: string }> {
  isFinal: boolean;
}

interface SpeechRecognitionResultEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function subscribeToSpeechSupport() {
  return () => {};
}

function getSpeechSupportSnapshot() {
  return getSpeechRecognitionConstructor() !== null;
}

function getSpeechSupportServerSnapshot() {
  return false;
}

function getSpeechErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone or speech recognition access was denied. Allow access in your browser settings, or use menu search.";
  }
  if (error === "no-speech") {
    return "No speech was detected. Try again, or use menu search.";
  }
  if (error === "audio-capture") {
    return "No microphone was found. Check your device, or use menu search.";
  }
  if (error === "network") {
    return "The speech recognition service is unavailable. Try again, or use menu search.";
  }
  return "Voice input stopped unexpectedly. Try again, or use menu search.";
}

function addReviewedItem(
  items: VoiceOrderItem[],
  item: VoiceOrderItem["item"],
  quantity: number,
) {
  const existing = items.find((reviewItem) => reviewItem.item.id === item.id);
  if (!existing) return [...items, { item, quantity }];

  return items.map((reviewItem) =>
    reviewItem.item.id === item.id
      ? { ...reviewItem, quantity: reviewItem.quantity + quantity }
      : reviewItem,
  );
}

export default function VoiceOrderAssistant() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isSpeechSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  );
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<VoiceOrderItem[]>([]);
  const [unresolved, setUnresolved] = useState<UnresolvedVoicePhrase[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [wasAdded, setWasAdded] = useState(false);
  const { addItem, items: cartItems } = useCart();

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  function clearReview() {
    setReviewItems([]);
    setUnresolved([]);
    setHasReviewed(false);
    setWasAdded(false);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setError("Voice input is not supported by this browser. Use menu search instead.");
      return;
    }

    recognitionRef.current?.abort();
    clearReview();
    setTranscript("");
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const recognizedText = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      setTranscript(recognizedText);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        setError(getSpeechErrorMessage(event.error));
      }
      setIsListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("Unable to start voice input. Check microphone access and try again.");
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      setError("Unable to stop voice input. Please try again.");
      setIsListening(false);
      recognitionRef.current = null;
    }
  }

  function updateTranscript(value: string) {
    setTranscript(value);
    setError(null);
    clearReview();
  }

  function reviewOrder() {
    const result = parseVoiceOrder(transcript, menuItems);
    setReviewItems(result.items);
    setUnresolved(result.unresolved);
    setHasReviewed(true);
    setWasAdded(false);
  }

  function chooseCandidate(index: number, item: UnresolvedVoicePhrase["candidates"][number]) {
    const phrase = unresolved[index];
    if (!phrase || phrase.reason !== "ambiguous") return;

    const quantity = phrase.requestedQuantity ?? 1;
    const existingQuantity =
      reviewItems.find((reviewItem) => reviewItem.item.id === item.id)?.quantity ?? 0;
    if (existingQuantity + quantity > 20) {
      setUnresolved((current) =>
        current.map((entry, entryIndex) =>
          entryIndex === index
            ? {
                ...entry,
                reason: "quantity-too-large",
                candidates: [item],
                requestedQuantity: existingQuantity + quantity,
              }
            : entry,
        ),
      );
      return;
    }

    setReviewItems((current) => addReviewedItem(current, item, quantity));
    setUnresolved((current) => current.filter((_, entryIndex) => entryIndex !== index));
    setWasAdded(false);
  }

  function changeQuantity(itemId: string, change: number) {
    setReviewItems((current) =>
      current.map((reviewItem) =>
        reviewItem.item.id === itemId
          ? {
              ...reviewItem,
              quantity: Math.max(1, Math.min(20, reviewItem.quantity + change)),
            }
          : reviewItem,
      ),
    );
    setWasAdded(false);
  }

  function removeItem(itemId: string) {
    setReviewItems((current) =>
      current.filter((reviewItem) => reviewItem.item.id !== itemId),
    );
    setWasAdded(false);
  }

  function addReviewedOrderToCart() {
    if (
      !hasReviewed ||
      wasAdded ||
      reviewItems.length === 0 ||
      unresolved.length > 0
    ) {
      return;
    }

    const overLimitItem = reviewItems.find((reviewItem) => {
      const currentQuantity =
        cartItems.find((cartItem) => cartItem.id === reviewItem.item.id)
          ?.quantity ?? 0;
      return currentQuantity + reviewItem.quantity > 20;
    });
    if (overLimitItem) {
      const currentQuantity =
        cartItems.find((cartItem) => cartItem.id === overLimitItem.item.id)
          ?.quantity ?? 0;
      setError(
        `Your cart already has ${currentQuantity} ${overLimitItem.item.title}. The maximum is 20 per item; adjust the cart before adding this voice order.`,
      );
      return;
    }

    setError(null);
    for (const reviewItem of reviewItems) {
      addItem(reviewItem.item, reviewItem.quantity);
    }
    setWasAdded(true);
  }

  return (
    <section
      aria-labelledby="voice-order-title"
      className="mb-6 rounded-2xl bg-altitude-navy p-4 text-altitude-white mobile:p-5"
    >
      <div className="flex flex-col gap-4 mobile:flex-row mobile:items-start mobile:justify-between">
        <div>
          <h2 id="voice-order-title" className="text-lg font-bold">
            Order by voice
          </h2>
          <p id="voice-order-help" className="mt-1 max-w-2xl text-sm text-white/75">
            Say item names and quantities. Review everything before it goes in
            your cart. Speech may be processed by your browser or device; this
            app does not save or upload your audio.
          </p>
        </div>
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={!isSpeechSupported && !isListening}
          aria-pressed={isListening}
          aria-describedby="voice-order-help"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-altitude-navy transition hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isListening ? (
            <MicOff aria-hidden="true" size={17} />
          ) : (
            <Mic aria-hidden="true" size={17} />
          )}
          {isListening
            ? "Stop listening"
            : isSpeechSupported
              ? "Speak your order"
              : "Voice unavailable"}
        </button>
      </div>

      <p className="mt-3 text-xs text-white/65" role="status" aria-live="polite">
        {!isSpeechSupported
          ? "Voice input is not supported in this browser. You can still search the menu below."
          : isListening
            ? "Listening… Tap Stop listening when you’re done."
            : transcript
              ? "Transcript captured. Review or edit it before continuing."
              : "Your browser may ask for microphone permission when you start."}
      </p>

      {error && (
        <p className="mt-3 text-sm text-rose-100" role="alert">
          {error}
        </p>
      )}

      {transcript && (
        <div className="mt-4">
          <label
            htmlFor="voice-order-transcript"
            className="mb-1 block text-sm font-semibold"
          >
            Transcript
          </label>
          <textarea
            id="voice-order-transcript"
            value={transcript}
            onChange={(event) => updateTranscript(event.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/20 bg-slate-950/40 p-3 text-sm text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20"
          />
          {!isListening && (
            <button
              type="button"
              onClick={reviewOrder}
              disabled={!transcript.trim()}
              className="mt-3 min-h-10 rounded-full bg-white px-4 text-sm font-semibold text-altitude-navy transition hover:bg-white/90 disabled:opacity-60"
            >
              Review order
            </button>
          )}
        </div>
      )}

      {hasReviewed && (
        <div className="mt-5 border-t border-white/15 pt-4">
          <h3 className="font-semibold">Review your order</h3>
          {reviewItems.length > 0 && (
            <ul className="mt-3 space-y-2">
              {reviewItems.map(({ item, quantity }) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/35 p-3"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, -1)}
                      disabled={quantity <= 1}
                      aria-label={`Decrease ${item.title} quantity`}
                      className="flex size-8 items-center justify-center rounded-full border border-white/20 disabled:opacity-40"
                    >
                      <Minus aria-hidden="true" size={15} />
                    </button>
                    <span className="min-w-5 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, 1)}
                      disabled={quantity >= 20}
                      aria-label={`Increase ${item.title} quantity`}
                      className="flex size-8 items-center justify-center rounded-full border border-white/20 disabled:opacity-40"
                    >
                      <Plus aria-hidden="true" size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.title} from voice order`}
                      className="flex size-8 items-center justify-center rounded-full text-white/75 hover:bg-white/10"
                    >
                      <X aria-hidden="true" size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {unresolved.length > 0 && (
            <ul className="mt-3 space-y-3">
              {unresolved.map((phrase, index) => (
                <li
                  key={`${phrase.reason}-${phrase.phrase}-${index}`}
                  className="rounded-xl border border-amber-200/30 bg-amber-200/10 p-3 text-sm"
                >
                  <p>
                    {phrase.reason === "ambiguous"
                      ? `Which item did you mean by “${phrase.phrase}”?`
                      : phrase.reason === "quantity-too-large"
                        ? `“${phrase.phrase}” exceeds the maximum of 20 per item. Edit the transcript and review again.`
                        : phrase.reason === "invalid-quantity"
                          ? `“${phrase.phrase}” must request at least one item. Edit the transcript and review again.`
                          : `Couldn’t match “${phrase.phrase}” to a menu item. Edit the transcript and review again.`}
                  </p>
                  {phrase.reason === "ambiguous" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {phrase.candidates.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => chooseCandidate(index, item)}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-altitude-navy"
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {reviewItems.length === 0 && unresolved.length === 0 && (
            <p className="mt-2 text-sm text-white/75">
              No items to add. Edit the transcript and review again.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addReviewedOrderToCart}
              disabled={
                reviewItems.length === 0 || unresolved.length > 0 || wasAdded
              }
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-altitude-navy transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShoppingBag aria-hidden="true" size={16} />
              {wasAdded ? "Added to cart" : "Add reviewed items to cart"}
            </button>
            <button
              type="button"
              onClick={clearReview}
              className="min-h-10 rounded-full border border-white/25 px-4 text-sm font-medium hover:bg-white/10"
            >
              Cancel review
            </button>
            {wasAdded && (
              <Link
                href="/cart"
                className="text-sm font-semibold underline underline-offset-4"
              >
                View cart
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
