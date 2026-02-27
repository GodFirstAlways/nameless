export function Reseller() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Reseller Program
          </h1>
          <p className="text-xl text-gray-400">
            Buy wholesale, sell retail, keep 50% profit
          </p>
        </div>

        {/* How It Works */}
        <div className="p-8 rounded-xl border border-white/10 bg-white/5 mb-8">
          <h3 className="text-2xl font-bold mb-6">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-cyan-400 font-bold text-xl">1</span>
              </div>
              <h4 className="font-semibold mb-2">Apply</h4>
              <p className="text-sm text-gray-400">Contact us on Discord to become an authorized reseller</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-cyan-400 font-bold text-xl">2</span>
              </div>
              <h4 className="font-semibold mb-2">Buy Wholesale</h4>
              <p className="text-sm text-gray-400">Purchase keys at 50% off retail price</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-cyan-400 font-bold text-xl">3</span>
              </div>
              <h4 className="font-semibold mb-2">Earn Profit</h4>
              <p className="text-sm text-gray-400">Sell at retail price and keep 50% margin</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-2">Pricing Structure</h3>
            <p className="text-gray-400">Example based on current NoChance pricing - varies by product</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <h3 className="text-xl font-bold mb-2">Wholesale Pricing</h3>
              <p className="text-sm text-gray-400 mb-6">What you pay (50% off retail)</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">1 Day</span>
                  <span className="font-bold text-white">~$1.50</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">3 Days</span>
                  <span className="font-bold text-white">~$3.50</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">1 Week</span>
                  <span className="font-bold text-white">~$6.50</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">1 Month</span>
                  <span className="font-bold text-white">~$12.50</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Lifetime</span>
                  <span className="font-bold text-cyan-400">~$22.50</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <h3 className="text-xl font-bold mb-2">Your Profit Per Sale</h3>
              <p className="text-sm text-gray-400 mb-6">Sell at retail, keep 50%</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">1 Day</span>
                  <span className="font-bold text-green-400">~$1.49</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">3 Days</span>
                  <span className="font-bold text-green-400">~$3.49</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">1 Week</span>
                  <span className="font-bold text-green-400">~$6.49</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-gray-300">1 Month</span>
                  <span className="font-bold text-green-400">~$12.49</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Lifetime</span>
                  <span className="font-bold text-green-400">~$22.50</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-sm text-cyan-200 text-center">
              💡 Pricing varies by product. Contact us on Discord for current wholesale rates on specific products.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-8 rounded-xl border border-white/10 bg-white/5 mb-8">
          <h3 className="text-2xl font-bold mb-6">Reseller Benefits</h3>
          <ul className="grid md:grid-cols-2 gap-4 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>50% wholesale discount on all products</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>3 free HWID resets per $50 spent</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>Volume bonuses (55% at $200+, 60% at $500+)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>Marketing materials provided</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>Priority reseller support</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>No monthly quotas or minimums</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>Payment via PayPal or crypto (BTC/ETH/USDT)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">✓</span>
              <span>Additional payment methods - contact to confirm</span>
            </li>
          </ul>
        </div>

        {/* Requirements */}
        <div className="p-8 rounded-xl border border-white/10 bg-white/5 mb-8">
          <h3 className="text-2xl font-bold mb-6">Requirements</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">●</span>
              <span>Minimum first order: $50</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">●</span>
              <span>Must sell at retail price or higher (no undercutting)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">●</span>
              <span>Handle your own customer support</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">●</span>
              <span>Legitimate online presence (Discord, website, etc.)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">●</span>
              <span>Agreement to reseller terms and MAP policy</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to Start Earning?</h3>
          <p className="text-gray-400 mb-6">
            Join Discord and DM us to apply for the reseller program
          </p>
          <a
            href="https://discord.gg/jx8W5rfkWm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold transition-all"
          >
            Apply on Discord
          </a>
        </div>
      </div>
    </div>
  );
}
