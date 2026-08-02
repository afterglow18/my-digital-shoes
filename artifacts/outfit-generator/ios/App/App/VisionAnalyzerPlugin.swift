import Capacitor
import Vision
import UIKit

/// Native Capacitor plugin that wraps Apple Vision for on-device photo analysis.
/// Called from the web layer via `VisionAnalyzer.analyze({ dataUrl, confidenceThreshold })`.
@objc(VisionAnalyzerPlugin)
public class VisionAnalyzerPlugin: CAPPlugin {

    @objc func analyze(_ call: CAPPluginCall) {
        guard let dataUrl = call.getString("dataUrl"), !dataUrl.isEmpty else {
            call.resolve(["labels": [String](), "texts": [String]()])
            return
        }

        let threshold = Float(call.getFloat("confidenceThreshold") ?? 0.4)

        DispatchQueue.global(qos: .utility).async { [weak self] in
            guard self != nil else { return }

            guard let cgImage = VisionAnalyzerPlugin.cgImageFromDataUrl(dataUrl) else {
                call.resolve(["labels": [String](), "texts": [String]()])
                return
            }

            let group   = DispatchGroup()
            var labels  = [String]()
            var texts   = [String]()

            // ── Classification ─────────────────────────────────────────────
            group.enter()
            let classRequest = VNClassifyImageRequest { request, _ in
                defer { group.leave() }
                guard let obs = request.results as? [VNClassificationObservation] else { return }
                labels = obs
                    .filter  { $0.confidence >= threshold }
                    .map     { $0.identifier.lowercased() }
                    .uniqued()
            }

            // ── Text recognition ───────────────────────────────────────────
            group.enter()
            let textRequest = VNRecognizeTextRequest { request, _ in
                defer { group.leave() }
                guard let obs = request.results as? [VNRecognizedTextObservation] else { return }
                texts = obs
                    .compactMap { $0.topCandidates(1).first?.string }
                    .map        { $0.lowercased().trimmingCharacters(in: .whitespacesAndNewlines) }
                    .filter     { !$0.isEmpty }
                    .uniqued()
            }
            textRequest.recognitionLevel = .accurate

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([classRequest, textRequest])
            } catch {
                // Both requests failed; groups still leave via their callbacks
                // but if the handler threw before calling them we must leave manually.
            }

            group.wait()
            call.resolve(["labels": labels, "texts": texts])
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static func cgImageFromDataUrl(_ dataUrl: String) -> CGImage? {
        guard let commaRange = dataUrl.range(of: ",") else { return nil }
        let base64 = String(dataUrl[commaRange.upperBound...])
        guard
            let data    = Data(base64Encoded: base64, options: .ignoreUnknownCharacters),
            let uiImage = UIImage(data: data),
            let cg      = uiImage.cgImage
        else { return nil }
        return cg
    }
}

// ── Uniqued helper ─────────────────────────────────────────────────────────────

private extension Array where Element == String {
    func uniqued() -> [String] {
        var seen = Set<String>()
        return filter { seen.insert($0).inserted }
    }
}
