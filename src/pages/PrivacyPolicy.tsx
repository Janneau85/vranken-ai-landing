import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-16">
        <Link 
          to="/" 
          className="inline-block mb-8 text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>
        
        <article className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Notice</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <p className="text-lg leading-relaxed">
              We respect your privacy. Messages sent to us via WhatsApp are used only to respond to your inquiries and to provide our services.
            </p>

            <p className="text-lg leading-relaxed">
              We do not share your data with third parties or use it for marketing without your consent.
            </p>

            <p className="text-lg leading-relaxed">
              WhatsApp processes messages as part of their service — please refer to{" "}
              <a 
                href="https://www.whatsapp.com/legal/privacy-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground underline hover:no-underline"
              >
                WhatsApp's Privacy Policy
              </a>
              {" "}for more information.
            </p>

            <p className="text-lg leading-relaxed">
              If you have any questions or want your data removed, please contact us at{" "}
              <a 
                href="mailto:social@janneau.eu" 
                className="text-foreground underline hover:no-underline"
              >
                social@janneau.eu
              </a>.
            </p>

            <p className="text-sm mt-8 pt-8 border-t border-border">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </article>
      </main>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
