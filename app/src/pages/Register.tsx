import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FinancialCard, FinancialCardContent } from '@/components/ui/financial-card';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User,
  ArrowRight,
  Chrome,
  Github,
  Apple,
  CheckCircle,
  Shield,
  Zap,
  Brain
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

const socialProviders = [
  { name: 'Google', icon: Chrome, description: 'Continue with Google' },
  { name: 'GitHub', icon: Github, description: 'Continue with GitHub' },
  { name: 'Apple', icon: Apple, description: 'Continue with Apple' },
];

const benefits = [
  { icon: Brain, title: 'AI-Powered Insights', description: 'Get personalized financial recommendations' },
  { icon: Shield, title: 'Bank-Grade Security', description: 'Your data is encrypted and protected' },
  { icon: Zap, title: 'Instant Setup', description: 'Start managing finances in under 2 minutes' },
];

const features = [
  'Automated expense tracking',
  'Bill payment reminders',
  'Investment portfolio analysis',
  'Budgeting tools & goals',
  'Real-time spending alerts',
  'Financial health score',
];

export function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-accent via-primary to-primary-hover relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 30% 70%, white 2px, transparent 2px),
                linear-gradient(135deg, transparent 48%, white 48%, white 52%, transparent 52%)
              `,
              backgroundSize: '120px 120px, 250px 250px'
            }}
          />
        </div>

        <div className="flex items-center justify-center p-12 relative z-10">
          <div className="text-center text-white max-w-lg">
            <div className="text-5xl font-bold mb-6">
              10,000+
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Users already saving smarter
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join our growing community of financially savvy individuals who use AI to optimize their money management.
            </p>
            
            {/* Features List */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-left">
              <h3 className="font-semibold mb-4 text-center">What you'll get:</h3>
              <div className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
                    <span className="text-white/90">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">$2.8K</div>
                <div className="text-sm text-white/70">Avg. Savings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">99.9%</div>
                <div className="text-sm text-white/70">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">4.9★</div>
                <div className="text-sm text-white/70">User Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-24 h-24 bg-white/10 rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-white/10 rounded-lg rotate-12"></div>
        <div className="absolute top-1/2 left-20 w-16 h-16 bg-white/10 rounded-xl -rotate-12"></div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 75% 25%, hsl(var(--accent)) 2px, transparent 2px),
                linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px, 20px 20px, 20px 20px'
            }}
          />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-8">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-xl shadow-primary">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                FinMind
              </span>
            </Link>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground">
              Start your journey to financial freedom in just a few steps
            </p>
          </div>

          {/* Social Registration */}
          <div className="space-y-3 mb-6">
            {socialProviders.map((provider) => (
              <Button
                key={provider.name}
                variant="outline"
                className="w-full h-12 justify-start space-x-3"
              >
                <provider.icon className="w-5 h-5" />
                <span>{provider.description}</span>
              </Button>
            ))}
          </div>

          <div className="relative mb-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">
                Or create account with email
              </span>
            </div>
          </div>

          {/* Form */}
          <FinancialCard variant="financial" className="border-2">
            <FinancialCardContent className="p-6">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        className="pl-10 h-12"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-10 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      className="pl-10 pr-10 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      className="pl-10 pr-10 h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start space-x-2 text-sm">
                    <input type="checkbox" className="rounded border-border mt-0.5" />
                    <span className="text-muted-foreground">
                      I agree to the{' '}
                      <Link to="/terms" className="text-primary hover:text-primary-hover">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-primary hover:text-primary-hover">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  
                  <label className="flex items-start space-x-2 text-sm">
                    <input type="checkbox" className="rounded border-border mt-0.5" />
                    <span className="text-muted-foreground">
                      Send me product updates and financial tips
                    </span>
                  </label>
                </div>

                <Button className="w-full h-12 group" size="lg">
                  Create your account
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </FinancialCardContent>
          </FinancialCard>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link 
                to="/signin" 
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 gap-4 mt-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3 text-sm">
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                  <benefit.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{benefit.title}</div>
                  <div className="text-muted-foreground">{benefit.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}