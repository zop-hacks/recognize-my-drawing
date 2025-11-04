"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  CheckCircle2,
  Circle,
  RefreshCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import DrawingCanvas from "@/components/DrawingCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ROUND_DURATION = 20;
const FEEDBACK_COOLDOWN_MS = 2000;

type GamePhase = "loading" | "ready" | "drawing" | "finished";

interface RoundResult {
  label: string;
  success: boolean;
  time: number;
}

export default function PlayPage() {
  const apiBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (!value) {
      return "";
    }
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const [phase, setPhase] = useState<GamePhase>("loading");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const roundStartRef = useRef<number | null>(null);
  const hasRoundEndedRef = useRef(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextRoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackCooldownRef = useRef(0);
  const lastPredictionRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (nextRoundTimeoutRef.current) {
      clearTimeout(nextRoundTimeoutRef.current);
      nextRoundTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    let ignore = false;

    const fetchPrompts = async () => {
      setErrorMessage(null);

      if (!apiBaseUrl) {
        setErrorMessage("API_URL environment variable is missing.");
        setPhase("ready");
        return;
      }

      setPhase("loading");
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/v1/get_random_prompts`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch prompts (${response.status})`);
        }

        const data = await response.json();
        const items = Array.isArray(data)
          ? data.map((item) => String(item))
          : [];

        if (!items.length) {
          throw new Error("No prompts returned by the server.");
        }

        if (ignore) return;

        setPrompts(items);
        setPhase("ready");
      } catch (error) {
        console.error("Failed to load prompts", error);
        if (ignore) return;

        setPrompts([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to fetch drawing prompts right now."
        );
        setPhase("ready");
      }
    };

    fetchPrompts();

    return () => {
      ignore = true;
    };
  }, [apiBaseUrl, refreshKey]);

  const startRound = useCallback(
    (index: number) => {
      if (!prompts[index]) {
        console.warn(
          "Attempted to start a round without a prompt at index",
          index
        );
        return;
      }

      clearTimers();

      hasRoundEndedRef.current = false;
      roundStartRef.current = Date.now();
      feedbackCooldownRef.current = 0;
      lastPredictionRef.current = null;

      setIsPredicting(false);
      setCurrentIndex(index);
      setTimeLeft(ROUND_DURATION);
      setResetSignal((prev) => prev + 1);
      setPhase("drawing");
    },
    [clearTimers, prompts]
  );

  const handleRoundCompletion = useCallback(
    (didWin: boolean, elapsedSecondsOverride?: number) => {
      if (phase !== "drawing") return;
      if (hasRoundEndedRef.current) return;

      hasRoundEndedRef.current = true;
      clearTimers();
      setIsPredicting(false);

      const prompt = prompts[currentIndex];
      if (!prompt) return;

      const now = Date.now();
      const startedAt = roundStartRef.current;
      let elapsedSeconds =
        typeof elapsedSecondsOverride === "number"
          ? elapsedSecondsOverride
          : startedAt
          ? (now - startedAt) / 1000
          : ROUND_DURATION;

      elapsedSeconds = Number(
        Math.min(ROUND_DURATION, Math.max(0, elapsedSeconds)).toFixed(1)
      );

      setResults((prev) => [
        ...prev,
        { label: prompt, success: didWin, time: elapsedSeconds },
      ]);

      setTimeLeft(Math.max(0, Math.ceil(ROUND_DURATION - elapsedSeconds)));

      roundStartRef.current = null;

      const nextIndex = currentIndex + 1;

      nextRoundTimeoutRef.current = setTimeout(() => {
        if (nextIndex < prompts.length) {
          startRound(nextIndex);
        } else {
          setPhase("finished");
        }
      }, 900);
    },
    [phase, prompts, currentIndex, clearTimers, startRound]
  );

  useEffect(() => {
    if (phase !== "drawing") {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          handleRoundCompletion(false, ROUND_DURATION);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [phase, currentIndex, handleRoundCompletion]);

  const handleCapture = useCallback(
    async (image: string) => {
      if (phase !== "drawing") return;
      if (!image) return;
      if (isPredicting) return;
      if (hasRoundEndedRef.current) return;
      if (!apiBaseUrl) return;

      const currentPrompt = prompts[currentIndex];
      if (!currentPrompt) return;

      setIsPredicting(true);

      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/predict_file`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image }),
        });

        if (!response.ok) {
          throw new Error(`Prediction request failed (${response.status})`);
        }

        const data = await response.json();
        const predictedLabel =
          typeof data?.label === "string" ? data.label : "";

        const normalizedPrediction = predictedLabel.trim().toLowerCase();
        const normalizedPrompt = currentPrompt.trim().toLowerCase();

        if (normalizedPrediction && normalizedPrediction === normalizedPrompt) {
          const now = Date.now();
          const elapsedSeconds = roundStartRef.current
            ? (now - roundStartRef.current) / 1000
            : 0;

          lastPredictionRef.current = null;
          feedbackCooldownRef.current = now;

          toast.success(`oh I know, it's ${currentPrompt}`, {
            description: `Recognized in ${elapsedSeconds.toFixed(1)}s`,
          });
          handleRoundCompletion(true, elapsedSeconds);
        } else {
          const now = Date.now();
          const shouldNotify =
            normalizedPrediction &&
            (normalizedPrediction !== lastPredictionRef.current ||
              now - feedbackCooldownRef.current > FEEDBACK_COOLDOWN_MS);

          if (shouldNotify) {
            feedbackCooldownRef.current = now;
            lastPredictionRef.current = normalizedPrediction;
            const displayLabel = predictedLabel || "something else";
            toast.warning(`are you sure this isn't a ${displayLabel}?`);
          }
        }
      } catch (error) {
        console.error("Prediction failed", error);
        const now = Date.now();
        if (now - feedbackCooldownRef.current > FEEDBACK_COOLDOWN_MS) {
          feedbackCooldownRef.current = now;
          toast.error("We couldn't check your drawing. Try again in a moment.");
        }
      } finally {
        setIsPredicting(false);
      }
    },
    [
      phase,
      isPredicting,
      apiBaseUrl,
      prompts,
      currentIndex,
      handleRoundCompletion,
    ]
  );

  const handleShuffle = useCallback(() => {
    clearTimers();
    setResults([]);
    setPrompts([]);
    setCurrentIndex(0);
    setTimeLeft(ROUND_DURATION);
    hasRoundEndedRef.current = false;
    roundStartRef.current = null;
    setResetSignal((prev) => prev + 1);
    setPhase("loading");
    setRefreshKey((prev) => prev + 1);
  }, [clearTimers]);

  const handleReplay = useCallback(() => {
    if (!prompts.length) {
      handleShuffle();
      return;
    }

    clearTimers();
    setResults([]);
    hasRoundEndedRef.current = false;
    roundStartRef.current = null;
    startRound(0);
  }, [clearTimers, prompts.length, startRound, handleShuffle]);

  const handleStart = useCallback(() => {
    if (!prompts.length) {
      toast.error("No prompts available. Try shuffling again.");
      return;
    }

    setResults([]);
    startRound(0);
  }, [prompts.length, startRound]);

  const currentPrompt = prompts[currentIndex] ?? "";
  const totalRounds = prompts.length;
  const timerProgress = Math.max(
    0,
    Math.min(100, (timeLeft / ROUND_DURATION) * 100)
  );
  const wins = results.filter((result) => result.success).length;
  const averageTime =
    results.length > 0
      ? (
          results.reduce((total, result) => total + result.time, 0) /
          results.length
        ).toFixed(1)
      : null;

  const promptStatuses = prompts.map((prompt, index) => {
    if (index < results.length) {
      return results[index].success ? "win" : "lose";
    }

    if (phase === "drawing" && index === results.length) {
      return "active";
    }

    return "pending";
  });

  return (
    <div className="h-viewport bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto flex flex-col gap-2 px-2 sm:px-4 py-1 sm:py-2 max-w-7xl h-full overflow-y-auto">
        <header className="mx-auto w-full max-w-5xl shrink-0">
          <Card className="border-primary/20 bg-white/80 backdrop-blur-sm shadow-lg dark:border-primary/40 dark:bg-gray-900/80 animate-in fade-in-0 slide-in-from-top-4 duration-700">
            <CardHeader className="gap-1 text-center sm:text-left p-2">
              <CardTitle className="text-base font-semibold sm:text-lg leading-tight">
                {phase === "drawing" && currentPrompt ? (
                  <span className="capitalize flex items-center justify-center sm:justify-start gap-2">
                    <Sparkles
                      className="size-4 shrink-0 animate-bounce text-primary"
                      aria-hidden
                    />
                    Draw: {currentPrompt}
                  </span>
                ) : (
                  "Can our model guess what you're sketching?"
                )}
              </CardTitle>
              {phase !== "drawing" && (
                <CardDescription className="text-xs max-w-3xl">
                  Sketch each prompt in under 20 seconds and let the CNN decide
                  if it knows what you drew.
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        </header>

        {phase === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <Card className="mx-auto w-full max-w-md items-center text-center animate-in fade-in-0 zoom-in-95 duration-500">
              <CardHeader className="p-4">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <Sparkles className="size-5 animate-spin text-primary" />
                  Setting up your sketchbook…
                </CardTitle>
                <CardDescription className="text-sm">
                  Fetching a fresh batch of prompts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-4">
                <Spinner className="size-6 text-primary" />
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "ready" && (
          <div className="flex-1 flex flex-col justify-center max-h-full overflow-hidden">
            <Card className="mx-auto w-full max-w-4xl animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <CardHeader className="p-3 sm:p-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <Circle className="size-5 text-green-500 animate-pulse" />
                  Ready when you are!
                </CardTitle>
                <CardDescription className="text-sm">
                  You'll get {totalRounds || "a few"} prompts — draw one at a
                  time and press start!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-4 max-h-96 overflow-y-auto">
                {errorMessage && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-in fade-in-0 shake">
                    {errorMessage}
                  </div>
                )}

                {prompts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                      <Sparkles className="size-4" />
                      The AI will try to guess these:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {prompts.map((prompt, index) => (
                        <Badge
                          key={prompt}
                          variant="outline"
                          className="capitalize text-xs animate-in fade-in-0 slide-in-from-left-2"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          {prompt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  <p className="font-medium text-foreground mb-2">
                    Quick rules:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✏️</span>
                      <span>Draw with mouse/finger</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">🤖</span>
                      <span>AI will auto check every 0.5s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">😃</span>
                      <span>Have fun</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">⏰</span>
                      <span>20s for each drawing</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2 p-3 sm:p-4">
                <Button
                  onClick={handleStart}
                  disabled={!prompts.length || !!errorMessage}
                  className="w-full sm:flex-1 bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold animate-pulse"
                  size="lg"
                >
                  🎨 Start Drawing!
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShuffle}
                  className="w-full sm:w-auto hover:bg-muted/50"
                >
                  <RefreshCcw className="mr-2 size-4" aria-hidden />
                  Shuffle
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {phase === "drawing" && (
          <div className="flex-1 flex flex-col xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2 min-h-0 overflow-hidden">
            {/* Progress panel - shows first on mobile, second on desktop */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg dark:bg-gray-900/80 order-1 xl:order-2 flex flex-col animate-in fade-in-0 slide-in-from-right-4 duration-500 min-h-0 xl:max-h-full">
              <CardHeader className="p-2 shrink-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Circle className="size-3 text-green-500 animate-pulse" />
                  Progress
                </CardTitle>
                <CardDescription className="text-xs">
                  AI's guessing streak
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 p-2 flex-1 min-h-0 overflow-y-auto">
                {prompts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Loading prompts...
                  </p>
                ) : (
                  <div className="space-y-1 max-h-full">
                    {prompts.map((prompt, index) => {
                      const status = promptStatuses[index];
                      const result = results[index];
                      const isActive = status === "active";

                      return (
                        <div
                          key={`${prompt}-${index}`}
                          className={cn(
                            "flex items-center justify-between rounded-md border px-2 py-1 transition-all duration-300 text-xs",
                            status === "win" &&
                              "border-emerald-500/60 bg-emerald-500/10 animate-in slide-in-from-left-2",
                            status === "lose" &&
                              "border-destructive/50 bg-destructive/10 animate-in slide-in-from-left-2",
                            isActive &&
                              "border-primary/50 bg-primary/10 ring-1 ring-primary/20 animate-pulse",
                            status === "pending" &&
                              "border-border/60 bg-muted/20"
                          )}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            {status === "win" && (
                              <CheckCircle2
                                className="size-3 text-emerald-500 shrink-0"
                                aria-hidden
                              />
                            )}
                            {status === "lose" && (
                              <XCircle
                                className="size-3 text-destructive shrink-0"
                                aria-hidden
                              />
                            )}
                            {status === "active" && (
                              <Sparkles
                                className="size-3 text-primary shrink-0 animate-spin"
                                aria-hidden
                              />
                            )}
                            {status === "pending" && (
                              <Circle
                                className="size-3 text-muted-foreground shrink-0"
                                aria-hidden
                              />
                            )}
                            <span className="font-medium capitalize text-foreground truncate text-xs">
                              {prompt}
                            </span>
                          </div>
                          <Badge
                            variant={
                              status === "win"
                                ? "default"
                                : status === "lose"
                                ? "destructive"
                                : status === "active"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs shrink-0 ml-1 px-1 py-0"
                          >
                            {status === "win" && result
                              ? `${result.time.toFixed(1)}s`
                              : null}
                            {status === "lose" && "❌"}
                            {status === "active" && "✏️"}
                            {status === "pending" && "⏳"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drawing panel - shows second on mobile, first on desktop */}
            <Card className="bg-white/80 shadow-lg backdrop-blur-sm dark:bg-gray-900/80 order-2 xl:order-1 flex flex-col animate-in fade-in-0 slide-in-from-left-4 duration-500 min-h-0">
              <CardHeader className="gap-1 p-2 shrink-0">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="w-fit animate-pulse text-xs"
                  >
                    Round {Math.min(results.length + 1, totalRounds)} of{" "}
                    {totalRounds}
                  </Badge>
                  <div className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                    <AlarmClock
                      className={cn(
                        "size-4 shrink-0",
                        timeLeft <= 5
                          ? "text-red-500 animate-pulse"
                          : "text-primary"
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        timeLeft <= 5 ? "text-red-500" : "text-foreground"
                      )}
                    >
                      {String(Math.max(0, timeLeft)).padStart(2, "0")}s
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 p-2 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-center gap-2 text-xs rounded-lg bg-muted/30 px-2 py-1">
                  {isPredicting ? (
                    <>
                      <Spinner className="size-3 text-primary" />
                      <span className="text-muted-foreground animate-pulse">
                        🤖 CNN is thinking...
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      ✏️ Draw boldly!
                    </span>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center min-h-0">
                  <DrawingCanvas
                    size={320}
                    onCapture={handleCapture}
                    resetSignal={resetSignal}
                  />
                </div>

                {/* Progress bar under canvas */}
                <Progress
                  value={timerProgress}
                  className={cn(
                    "h-2 transition-all duration-300",
                    timeLeft <= 5 && "animate-pulse"
                  )}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "finished" && (
          <div className="flex-1 flex flex-col justify-center max-h-full overflow-hidden">
            <Card className="mx-auto w-full max-w-5xl bg-white/80 backdrop-blur-sm shadow-lg dark:bg-gray-900/80 animate-in fade-in-0 zoom-in-95 duration-700">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl font-semibold">
                  Game over — here&apos;s how you did
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {wins} / {results.length} guesses matched the model.
                  {averageTime && ` Average sketch time: ${averageTime}s.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-left">Prompt</TableHead>
                        <TableHead className="text-center">
                          AI guessed it?
                        </TableHead>
                        <TableHead className="text-right">Time (s)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow key={`${result.label}-${index}`}>
                          <TableCell className="capitalize font-medium">
                            {result.label}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {result.success ? (
                                <CheckCircle2
                                  className="size-4 text-emerald-500"
                                  aria-hidden
                                />
                              ) : (
                                <XCircle
                                  className="size-4 text-destructive"
                                  aria-hidden
                                />
                              )}
                              <span className="text-sm">
                                {result.success ? "Yes" : "No"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {result.time.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
                  <Badge variant="default" className="bg-emerald-500">
                    Wins: {wins}
                  </Badge>
                  <Badge variant="destructive">
                    Misses: {results.length - wins}
                  </Badge>
                  {averageTime && (
                    <Badge variant="outline">Avg time: {averageTime}s</Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6">
                <Button
                  onClick={handleReplay}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  Play again
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleShuffle}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  <RefreshCcw className="mr-2 size-4" aria-hidden />
                  Get new prompts
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
