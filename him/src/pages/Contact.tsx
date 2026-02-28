import { MessageSquare, HelpCircle, Users } from 'lucide-react';

export function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-400">
            Join our Discord for support and community
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Support</h3>
            <p className="text-sm text-gray-400">
              Get help with technical issues, purchases, or general questions
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Community</h3>
            <p className="text-sm text-gray-400">
              Connect with other users, share tips, and stay updated
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Resellers</h3>
            <p className="text-sm text-gray-400">
              Apply for wholesale pricing and partnership opportunities
            </p>
          </div>
        </div>

        <div className="p-12 rounded-xl border border-white/10 bg-white/5 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-cyan-400" />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">Join Our Discord</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Discord is our primary support channel. Get instant help from staff and community, 
            stay updated on new features, report issues, and connect with other users.
          </p>

          <a
            href="https://discord.gg/jx8W5rfkWm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold transition-all text-lg"
          >
            Join Discord Server
          </a>

          <p className="text-sm text-gray-500 mt-6">
            Response time: Usually within 24-48 hours
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl border border-white/10 bg-white/5">
            <h3 className="font-semibold text-white mb-3">Support Hours</h3>
            <p className="text-gray-400 text-sm mb-2">
              We monitor Discord daily and aim to respond within 24-48 hours.
            </p>
            <p className="text-gray-400 text-sm">
              For urgent issues, ping @Support in the Discord server.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5">
            <h3 className="font-semibold text-white mb-3">Before Contacting</h3>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Check the FAQ page first</li>
              <li>• Have your order ID ready (if applicable)</li>
              <li>• Include screenshots of any errors</li>
              <li>• Be clear and specific about your issue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
