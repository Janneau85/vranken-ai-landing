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
          <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
          
          <div className="space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Introduction</h2>
              <p>
                At Vranken.AI, we take your privacy seriously. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you visit our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Information We Collect</h2>
              <p>
                We may collect information about you in a variety of ways. The information we may collect
                on the Site includes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
                <li>Personal Data: Name, email address, and contact information you provide to us.</li>
                <li>Derivative Data: Information our servers automatically collect when you access the Site.</li>
                <li>Financial Data: Financial information related to transactions on our Site.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Use of Your Information</h2>
              <p>
                Having accurate information about you permits us to provide you with a smooth, efficient,
                and customized experience. Specifically, we may use information collected about you via
                the Site to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
                <li>Create and manage your account.</li>
                <li>Process your transactions and send you related information.</li>
                <li>Improve our website and services.</li>
                <li>Send you administrative information and updates.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Disclosure of Your Information</h2>
              <p>
                We may share information we have collected about you in certain situations. Your information
                may be disclosed as follows:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-2 ml-4">
                <li>By Law or to Protect Rights</li>
                <li>Third-Party Service Providers</li>
                <li>Business Transfers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Contact Us</h2>
              <p>
                If you have questions or comments about this Privacy Policy, please contact us at:
                <br />
                <span className="text-foreground">contact@vranken.ai</span>
              </p>
            </section>

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
