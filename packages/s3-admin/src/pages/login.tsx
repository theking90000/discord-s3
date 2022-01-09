import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import ThemeToggler from "../components/ThemeToggler";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useState } from "react";
import { axiosClient } from "../lib/data-fetch";
import { useGuardStore } from "../components/RouteGuard";
import { useRouter } from "next/router";

function Login() {
  const { t } = useTranslation("login");

  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const setConnected = useGuardStore((state) => state.setConnected);

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (loading) return;
    setLoading(true);
    axiosClient
      .post<{ token: string }>("/auth", { name, password })
      .then(({ data }) => {
        localStorage.setItem("x-api-token", data.token);

        setTimeout(() => {
          hideLoading();
          router.push((router.query.returnUrl as string) || "/");
        }, 150);
      })
      .catch((err) => {
        hideLoading(err);
      });
  };

  const hideLoading = (err?: any) => {
    setTimeout(() => {
      if (err) setErr(err?.response?.data?.message || err.message);
      setLoading(false);
    }, 1000);
  };

  return (
    <>
      <ThemeToggler />
      <Flex width="full" align="center" justifyContent="center">
        <Box
          p={8}
          maxWidth="500px"
          borderWidth={1}
          borderRadius={8}
          boxShadow="lg"
        >
          <Box textAlign="center">
            <Heading>{t("login")}</Heading>
          </Box>
          <Box my={4} textAlign="center">
            <form onSubmit={handleSubmit}>
              <FormControl isRequired>
                <FormLabel>{t("name")}</FormLabel>
                <Input
                  onChange={(ev) => setName(ev.currentTarget.value)}
                  type="name"
                  placeholder="theking90000"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>{t("password")}</FormLabel>
                <Input
                  autoComplete="none"
                  onChange={(ev) => setPassword(ev.currentTarget.value)}
                  type="password"
                  placeholder="*******"
                />
              </FormControl>
              {err && <Text color="red.500">{err}</Text>}
              <Button
                colorScheme="teal"
                variant="outline"
                width="full"
                mt={4}
                type="submit"
              >
                {loading ? <Spinner colorScheme="teal" /> : t("sign_in")}
              </Button>
            </form>
          </Box>
        </Box>
      </Flex>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "login"])),
    },
  };
}

export default Login;
