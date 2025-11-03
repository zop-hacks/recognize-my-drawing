import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MainLogo, brand_name } from "@/components/custom/branding";
import { Sparkles, Palette, Trophy } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center space-y-8">
          {/* Logo and Title */}
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-full shadow-lg">
              <MainLogo />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              {brand_name}
            </h1>
          </div>

          {/* Description */}
          <div className="max-w-3xl mx-auto space-y-6">
            <p className="text-xl sm:text-2xl text-gray-600 leading-relaxed">
              A CNN model will try to guess your drawing!
            </p>
            <p className="text-lg text-gray-500">
              Challenge yourself with various prompts, and put your drawing
              skills to the test, while the CNN will try to recognize what you
              draw
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Link href="/play">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                <Palette className="mr-2 h-5 w-5" />
                Start Drawing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">AI Recognition</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Our advanced AI model recognizes your drawings in real-time,
                providing instant feedback on your artistic creations.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Palette className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Quick & Fun</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Fast-paced drawing challenges that test your speed and
                creativity. Perfect for quick breaks or extended gaming
                sessions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Challenge Yourself</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                Improve your drawing skills with various difficulty levels and
                diverse prompts that keep the game exciting and challenging.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Test Your Skills?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of players who are already enjoying this addictive
            drawing game. No registration required - just start drawing!
          </p>
          <Link href="/play">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-2 hover:bg-gray-900 hover:text-white transition-colors duration-200"
            >
              Play Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
