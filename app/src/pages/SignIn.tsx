import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FinancialCard, FinancialCardContent, FinancialCardDescription, FinancialCardHeader, FinancialCardTitle } from '@/components/ui/financial-card';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Chrome,
  Github,
  Apple,
  Shield,
  Zap,
  Users
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { login } from '@/api/auth';
import { setToken, setRefreshToken } from '@/lib/auth';

const socialProviders = [
  { name: 'Google', icon: Chrome, description: 'Sign in with Google' },
  { name: 'GitHub', icon: Github, description: 'Sign in with GitHub' },
  { name: 'Apple', icon: Apple, description: 'Sign in with Apple' },
];

const features = [
  { icon: Shield, title: 'Secure Login', description: 'Military-grade encryption' },
  { icon: Zap, title: 'Instant Access', description: 'Get started in seconds' },
  { icon: Users, title: 'Trusted by 10K+', description: 'Join our community' },
];

export function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/dashboard';

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, hsl(var(--primary)) 2px, transparent 2px),
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
              Welcome back
            </h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue your financial journey
            </p>
          </div>

          {/* Social Login */}
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
                Or continue with email
              </span>
            </div>
          </div>

          {/* Form */}
          <FinancialCard variant="financial" className="border-2">
            <FinancialCardContent className="p-6">
              <form
                className="space-y-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  setLoading(true);
                  try {
                    const res = await login(email.trim(), password);
                    setToken(res.access_token);
                    if (res.refresh_token) setRefreshToken(res.refresh_token);
                    nav(from, { replace: true });
                  } catch (err: any) {
                    setError(err?.message || 'Sign in failed');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
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
                      placeholder="Enter your password"
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

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" className="rounded border-border" />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}

                <Button className="w-full h-12 group" size="lg" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in to your account'}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </FinancialCardContent>
          </FinancialCard>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-primary hover:text-primary-hover font-medium transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mb-2 mx-auto">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="text-xs font-medium text-foreground">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-primary-hover to-accent relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 50%, white 2px, transparent 2px),
                linear-gradient(45deg, transparent 48%, white 48%, white 52%, transparent 52%)
              `,
              backgroundSize: '100px 100px, 200px 200px'
            }}
          />
        </div>

        <div className="flex items-center justify-center p-12 relative z-10">
          <div className="text-center text-white max-w-lg">
            <div className="text-6xl font-bold mb-6">
              $2.4M+
            </div>
            <h2 className="text-3xl font-bold mb-4">
              Managed for our users
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of users who trust FinMind to manage their financial future with AI-powered insights and intelligent automation.
            </p>
            
            {/* Testimonial */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-white/90 italic mb-4">
                "FinMind has completely transformed how I manage my finances. The AI insights are incredible!"
              </p>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full"></div>
                <div>
                  <div className="font-medium text-white">Sarah Johnson</div>
                  <div className="text-sm text-white/70">Software Engineer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white/10 rounded-lg rotate-45"></div>
        <div className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-xl rotate-12"></div>
      </div>
    </div>
  );
}
