// app/index.jsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import bytesLogo from "../assets/images/b.png";

export default function Index() {
    const router = useRouter();

    return (
        <LinearGradient
            colors={["#AC97D8", "#DBFBF1"]}  // static gradient
            style={styles.root}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <View style={styles.content}>

                <Image source={bytesLogo} style={styles.logo} resizeMode="contain" />

                <Text style={styles.title}>
                    Welcome to BYTES4FUTURE
                </Text>

                <Text style={styles.subtitle}>
                    Chat · Learn · Connect
                </Text>

                {/* Start → SIGNUP */}
                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={() => router.push("/auth/signup")}
                >
                    <Text style={styles.mainButtonText}>Start</Text>
                </TouchableOpacity>

                {/* Already have account → LOGIN */}
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.push("/auth/login")}
                >
                    <Text style={styles.secondaryButtonText}>
                        I already have an account
                    </Text>
                </TouchableOpacity>

            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    logo: {
        width: 560,
        height: 320,
        marginTop: 60,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        textAlign: "center",
        color: "#000",
    },
    subtitle: {
        fontSize: 14,
        marginTop: 6,
        marginBottom: 32,
        textAlign: "center",
        color: "#666666",  // ✅ Fixed: was "#0000" (invalid)
    },
    mainButton: {
        width: "100%",
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
        marginBottom: 10,
        backgroundColor: "#06FDAC",
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#00332A",
    },
    secondaryButton: {
        width: "100%",
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#FFFFFF",
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#333333",  // ✅ Fixed: was "#0000" (invalid)
    },
});
