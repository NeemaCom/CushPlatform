import { Link } from "wouter";
import { ExternalLink } from "lucide-react";

interface LegalLinksProps {
  className?: string;
  variant?: "footer" | "inline" | "checkbox";
  showIcons?: boolean;
}

export default function LegalLinks({ 
  className = "", 
  variant = "footer", 
  showIcons = false 
}: LegalLinksProps) {
  
  const baseClasses = {
    footer: "text-sm text-gray-600 hover:text-gray-900 transition-colors",
    inline: "text-blue-600 hover:text-blue-800 underline",
    checkbox: "text-xs text-blue-600 hover:text-blue-800 underline"
  };

  const linkClass = `${baseClasses[variant]} ${className}`;

  if (variant === "checkbox") {
    return (
      <span className="text-xs text-gray-600">
        By creating an account, you agree to our{" "}
        <Link to="/terms-of-service" className={linkClass}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy-policy" className={linkClass}>
          Privacy Policy
        </Link>
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <Link to="/privacy-policy" className={linkClass}>
        <span className="flex items-center gap-1">
          Privacy Policy
          {showIcons && <ExternalLink className="w-3 h-3" />}
        </span>
      </Link>
      
      <Link to="/terms-of-service" className={linkClass}>
        <span className="flex items-center gap-1">
          Terms of Service
          {showIcons && <ExternalLink className="w-3 h-3" />}
        </span>
      </Link>
    </div>
  );
}