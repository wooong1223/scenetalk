from google.genai import types

LIVE_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="set_emotion",
                description="Update the 3D character's facial expression to match the current line.",
                behavior="NON_BLOCKING",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "emotion": types.Schema(
                            type="STRING",
                            enum=["neutral", "happy", "sad", "angry", "surprised"],
                        ),
                        "intensity": types.Schema(type="NUMBER"),
                    },
                    required=["emotion"],
                ),
            ),
            types.FunctionDeclaration(
                name="play_gesture",
                description="Trigger a physical gesture on the 3D VRM avatar.",
                behavior="NON_BLOCKING",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "gesture": types.Schema(
                            type="STRING",
                            enum=["nod", "wave", "look_away", "smile", "shrug"],
                        ),
                    },
                    required=["gesture"],
                ),
            ),
            types.FunctionDeclaration(
                name="propose_story_event",
                description="Signal that the conversation reached a dramatic beat.",
                behavior="NON_BLOCKING",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "title_ko": types.Schema(type="STRING"),
                        "kind": types.Schema(
                            type="STRING",
                            enum=[
                                "sudden_rain",
                                "phone_rings",
                                "misunderstanding",
                                "confession_moment",
                                "stranger_enters",
                            ],
                        ),
                    },
                    required=["title_ko", "kind"],
                ),
            ),
        ]
    )
]
