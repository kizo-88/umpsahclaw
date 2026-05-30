#include <napi.h>
#include <string>

Napi::String ProcessInput(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }

    std::string userInput = info[0].As<Napi::String>().Utf8Value();
    
    // In a real application, you would bridge this to PicoClaw's IPC or binary
    std::string response = "C++ Processor Hooked! UMPSAHLLM received: " + userInput;

    return Napi::String::New(env, response);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "processInput"),
                Napi::Function::New(env, ProcessInput));
    return exports;
}

NODE_API_MODULE(umpsahllm_native, Init)
