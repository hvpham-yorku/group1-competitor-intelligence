from rlm import RLM

rlm = RLM(
    backend="gemini",
    backend_kwargs={"model_name": "gemini-3-flash-preview"},
    verbose=True,  # For printing to console with rich, disabled by default.
)
FinalAnswer = rlm.completion("Print me the first 100 powers of two, each on a newline.").response
print("The returned output is")
print(FinalAnswer)